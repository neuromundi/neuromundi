-- 0269: el plazo para conservar la ficha en el directorio deja de ser una fecha
-- global y pasa a contarse desde el dia en que sale el correo de cada ficha.
--
-- Mismo patron que la 0261 aplico al precio de fundador, con UNA DIFERENCIA
-- deliberada que conviene dejar escrita:
--
--   En el precio de fundador, la fecha del pais es un TOPE DURO, porque la
--   campana comercial tiene un final. Aqui NO se pone tope, y es a proposito:
--   si el 1 de enero siguiera siendo tope, a quien invitemos en diciembre le
--   seguirian quedando 29 dias contra los 73 de quien reciba el correo el 20 de
--   octubre, que es justo la desigualdad que se quiere quitar. La fecha global
--   se conserva como valor por omision para las fichas que nunca se invitaron.
--
-- 75 dias, que es aproximadamente lo que recibe la primera tanda de Mexico con
-- la fecha global actual. Asi nadie recibe menos que el mejor tratado hoy.

alter table public.campaign_config
  add column if not exists permanencia_days int not null default 75;

comment on column public.campaign_config.permanencia_days is
  'Dias para reclamar la ficha antes de que se retire, contados desde el envio.';

alter table public.directorio
  add column if not exists permanencia_hasta timestamptz;

comment on column public.directorio.permanencia_hasta is
  'Hasta cuando se conserva esta ficha sin reclamar. Se graba al enviar la invitacion.';

-- Version de dos argumentos: la fecha propia de la ficha manda; si no tiene,
-- se cae a la fecha global de la campana, como siempre.
create or replace function public.ficha_visible(p_reclamada_por uuid, p_hasta timestamptz)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select now() < coalesce(p_hasta, public.verificacion_deadline())
      or (p_reclamada_por is not null and public.cuota_cubierta(p_reclamada_por));
$$;

create or replace function public.ficha_contacto_visible(p_reclamada_por uuid, p_hasta timestamptz)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select now() < coalesce(p_hasta, public.verificacion_deadline())
      or (p_reclamada_por is not null and public.cuota_cubierta(p_reclamada_por));
$$;

grant execute on function public.ficha_visible(uuid, timestamptz) to anon, authenticated, service_role;
grant execute on function public.ficha_contacto_visible(uuid, timestamptz) to anon, authenticated, service_role;

-- La vista publica pasa a usar la fecha propia de cada ficha. Se reescribe
-- sustituyendo el texto de su propia definicion, para no re-teclear a mano las
-- setenta columnas y arriesgar una diferencia silenciosa.
do $$
declare v_def text; v_nuevo text;
begin
  select pg_get_viewdef('public.directorio_publico'::regclass, true) into v_def;

  v_nuevo := replace(v_def, 'ficha_contacto_visible(d.reclamada_por)',
                            'ficha_contacto_visible(d.reclamada_por, d.permanencia_hasta)');
  v_nuevo := replace(v_nuevo, 'ficha_visible(d.reclamada_por)',
                              'ficha_visible(d.reclamada_por, d.permanencia_hasta)');

  if v_nuevo = v_def then
    raise exception 'no se encontro que sustituir en la vista: revisar a mano';
  end if;

  execute 'create or replace view public.directorio_publico as ' || v_nuevo;
end $$;

-- Al enviar, se sella tambien la permanencia de la ficha.
create or replace function public.sellar_plazo_invitacion(p_token text)
returns timestamptz language plpgsql security definer set search_path to 'public' as $$
declare v_pais text; v_tope timestamptz; v_hasta timestamptz; v_ya timestamptz; v_ficha uuid;
begin
  select i.fundador_hasta, d.pais, d.id into v_ya, v_pais, v_ficha
  from public.directorio_invitaciones i
  join public.directorio d on d.id = i.directorio_id
  where i.token = p_token;

  if v_pais is null then return null; end if;

  -- Permanencia: se sella una sola vez, no se mueve en reenvios.
  update public.directorio
     set permanencia_hasta = date_trunc('day', now()
           + make_interval(days => (select permanencia_days from public.campaign_config where id = 1)))
           + interval '23 hours 59 minutes'
   where id = v_ficha and permanencia_hasta is null;

  if v_ya is not null then return v_ya; end if;   -- fundador ya sellado

  v_hasta := date_trunc('day', now() + make_interval(days => public.founder_days_for(v_pais)))
             + interval '23 hours 59 minutes';
  v_tope  := public.founder_country_deadline(v_pais);
  if v_tope is not null and v_hasta > v_tope then v_hasta := v_tope; end if;

  update public.directorio_invitaciones set fundador_hasta = v_hasta where token = p_token;
  return v_hasta;
end $$;
revoke all on function public.sellar_plazo_invitacion(text) from public, anon, authenticated;
grant execute on function public.sellar_plazo_invitacion(text) to service_role;
