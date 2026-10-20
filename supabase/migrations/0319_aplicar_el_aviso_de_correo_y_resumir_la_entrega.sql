-- Aplica un aviso de Resend y saca sus consecuencias:
--  · rebotado / suppressed / failed  -> la ficha queda marcada y sale de la cola
--  · complained (queja de spam)      -> igual, y ademas se CANCELA la invitacion:
--    a quien marca como spam no se le vuelve a escribir, ni con un recordatorio
--  · delivered / opened / clicked    -> solo quedan registrados
-- Es idempotente por (aviso_id, evento): Resend reintenta el mismo aviso si no
-- recibe un 200, y un reintento no debe volver a aplicar nada.
create or replace function public.registrar_evento_de_correo(
  p_evento text,
  p_correo text,
  p_aviso_id text,
  p_mensaje_id text default null,
  p_ocurrido timestamptz default null,
  p_datos jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_nuevo boolean; v_fichas int := 0; v_canceladas int := 0;
begin
  if p_evento is null or btrim(p_evento) = '' or p_aviso_id is null then
    return jsonb_build_object('ok', false, 'motivo', 'faltan datos del aviso');
  end if;

  insert into public.correo_eventos (evento, correo, aviso_id, mensaje_id, ocurrido_en, datos)
  values (btrim(p_evento), lower(nullif(btrim(p_correo), '')), p_aviso_id,
          nullif(btrim(p_mensaje_id), ''), coalesce(p_ocurrido, now()),
          coalesce(p_datos, '{}'::jsonb))
  on conflict (aviso_id, evento) do nothing;

  v_nuevo := found;
  if not v_nuevo then
    return jsonb_build_object('ok', true, 'repetido', true);
  end if;

  if p_evento in ('email.bounced', 'email.suppressed', 'email.failed', 'email.complained')
     and nullif(btrim(p_correo), '') is not null then
    update public.directorio
       set correo_rebotado = true,
           correo_rebotado_el = coalesce(p_ocurrido, now())
     where lower(btrim(correo)) = lower(btrim(p_correo))
       and not coalesce(correo_rebotado, false);
    v_fichas := coalesce((select count(*) from public.directorio
                          where lower(btrim(correo)) = lower(btrim(p_correo))
                            and coalesce(correo_rebotado, false)), 0);

    if p_evento = 'email.complained' then
      update public.directorio_invitaciones i
         set cancelada_en = coalesce(i.cancelada_en, coalesce(p_ocurrido, now())),
             cancelada_motivo = coalesce(i.cancelada_motivo, 'queja de spam del destinatario')
       where lower(btrim(i.correo)) = lower(btrim(p_correo))
         and i.usada_en is null;
      v_canceladas := 1;
    end if;
  end if;

  return jsonb_build_object('ok', true, 'repetido', false,
                            'fichas_marcadas', v_fichas, 'cancelada', v_canceladas > 0);
end $$;

-- La escribe SOLO la funcion de borde con la llave de servicio. Nadie mas:
-- si un usuario con sesion pudiera llamarla, podria marcar como rebotada la
-- ficha de un competidor.
revoke all on function public.registrar_evento_de_correo(text, text, text, text, timestamptz, jsonb) from anon, authenticated;
grant execute on function public.registrar_evento_de_correo(text, text, text, text, timestamptz, jsonb) to service_role;

-- Resumen para el panel: entregados, rebotados, quejas y clics por tanda.
create or replace function public.admin_entrega_por_tanda()
returns table(tanda smallint, enviadas bigint, entregados bigint, rebotados bigint, quejas bigint, clics bigint)
language sql
stable
security definer
set search_path to 'public'
as $$
  select pl.tanda,
         count(*) filter (where i.enviada_en is not null),
         count(*) filter (where exists (select 1 from public.correo_eventos e
                            where lower(e.correo) = lower(i.correo) and e.evento = 'email.delivered')),
         count(*) filter (where exists (select 1 from public.correo_eventos e
                            where lower(e.correo) = lower(i.correo) and e.evento in ('email.bounced','email.suppressed','email.failed'))),
         count(*) filter (where exists (select 1 from public.correo_eventos e
                            where lower(e.correo) = lower(i.correo) and e.evento = 'email.complained')),
         count(*) filter (where i.abierta_en is not null)
  from public.directorio_plan_invitacion pl
  join public.directorio_invitaciones i on i.directorio_id = pl.ficha_id
  where public.is_admin()
  group by pl.tanda
  order by pl.tanda;
$$;

revoke all on function public.admin_entrega_por_tanda() from anon;
grant execute on function public.admin_entrega_por_tanda() to authenticated;
