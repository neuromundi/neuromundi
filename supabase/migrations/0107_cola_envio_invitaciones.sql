-- ============================================================================
-- 0107 · cola de envío de invitaciones del directorio + marcado seguro
--
-- Da a la Edge Function `enviar-invitaciones` una cola BLINDADA y las funciones
-- para marcar enviado/rebote. Toda la lógica de "a quién sí se le envía" vive
-- aquí (como campaign_welcome_queue), para que el enviador no pueda saltarse
-- una guarda por error.
--
-- GARANTÍAS de la cola (todas deben cumplirse para que una fila salga):
--   invitación:  enviada_en IS NULL, cancelada_en IS NULL, usada_en IS NULL,
--                baja_en IS NULL, expira_en > now(), correo con formato válido.
--   ficha:       estado_revision='publicado', NOT baja_solicitada,
--                reclamada_por IS NULL, NOT correo_rebotado.
-- Devuelve el `sector` para que el enviador elija el encuadre (público/social
-- SIN oferta de pago). NO envía nada: solo lee y marca.
--
-- Idempotente (create or replace). Solo service_role ejecuta.
-- ============================================================================

create or replace function public.directorio_invitaciones_cola(p_limit integer default 500)
returns table (
  token text, correo text, nombre text, provider_type text,
  sector text, estado text, ciudad text)
language sql stable security definer set search_path to 'public' as $$
  select i.token, i.correo, d.nombre, d.provider_type,
         coalesce(d.sector, 'privado'), d.estado, d.ciudad
  from public.directorio_invitaciones i
  join public.directorio d on d.id = i.directorio_id
  where i.enviada_en   is null
    and i.cancelada_en is null
    and i.usada_en     is null
    and i.baja_en      is null
    and i.expira_en    > now()
    and i.correo ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'
    and i.correo !~* '@preview\.neuromundi\.com$'
    and d.estado_revision = 'publicado'
    and not d.baja_solicitada
    and d.reclamada_por is null
    and not coalesce(d.correo_rebotado, false)
  order by d.nombre
  limit greatest(1, least(coalesce(p_limit, 500), 1000));
$$;
revoke all on function public.directorio_invitaciones_cola(integer) from public, anon, authenticated;
grant execute on function public.directorio_invitaciones_cola(integer) to service_role;

-- Marca una invitación como enviada (idempotente: solo si sigue "viva").
create or replace function public.directorio_invitacion_enviada(p_token text)
returns boolean
language plpgsql security definer set search_path to 'public' as $$
declare v_n int;
begin
  update public.directorio_invitaciones
     set enviada_en = now()
   where token = p_token
     and enviada_en is null and cancelada_en is null
     and usada_en is null and baja_en is null;
  get diagnostics v_n = row_count;
  return v_n > 0;
end $$;
revoke all on function public.directorio_invitacion_enviada(text) from public, anon, authenticated;
grant execute on function public.directorio_invitacion_enviada(text) to service_role;

-- Marca un rebote: cancela la invitación y marca el correo de la ficha como
-- rebotado, para no volver a escribirle (protege la reputación del dominio).
create or replace function public.directorio_invitacion_rebote(p_token text, p_motivo text default 'bounce')
returns boolean
language plpgsql security definer set search_path to 'public' as $$
declare v_ficha uuid;
begin
  update public.directorio_invitaciones
     set cancelada_en = now(), cancelada_motivo = coalesce(p_motivo, 'bounce')
   where token = p_token and cancelada_en is null
   returning directorio_id into v_ficha;
  if v_ficha is not null then
    update public.directorio
       set correo_rebotado = true, correo_rebotado_el = current_date
     where id = v_ficha;
  end if;
  return v_ficha is not null;
end $$;
revoke all on function public.directorio_invitacion_rebote(text, text) from public, anon, authenticated;
grant execute on function public.directorio_invitacion_rebote(text, text) to service_role;
