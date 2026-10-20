-- El plazo de fundador y la permanencia se sellaban truncando el dia en UTC y
-- sumando 23:59, lo que aterriza a las 17:59 de Ciudad de Mexico, no a las
-- 23:59. Toda la campana corre en hora de CDMX (los topes de campaign_config
-- estan guardados como 05:59Z = 23:59 CDMX, y el correo imprime las fechas en
-- esa zona), asi que quien pagara a las 20:00 de su ultimo dia se encontraba el
-- descuento vencido seis horas antes de lo anunciado. Ahora el dia se trunca en
-- hora de CDMX.
create or replace function public.sellar_plazo_invitacion(p_token text)
returns timestamp with time zone
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_pais text; v_tope timestamptz; v_hasta timestamptz; v_ya timestamptz; v_ficha uuid;
  v_zona constant text := 'America/Mexico_City';
begin
  select i.fundador_hasta, d.pais, d.id into v_ya, v_pais, v_ficha
  from public.directorio_invitaciones i
  join public.directorio d on d.id = i.directorio_id
  where i.token = p_token;

  if v_pais is null then return null; end if;

  -- Permanencia: se sella una sola vez, no se mueve en reenvios.
  update public.directorio
     set permanencia_hasta = (
           date_trunc('day', (now() at time zone v_zona)
             + make_interval(days => (select permanencia_days from public.campaign_config where id = 1)))
           + interval '23 hours 59 minutes'
         ) at time zone v_zona
   where id = v_ficha and permanencia_hasta is null;

  if v_ya is not null then return v_ya; end if;   -- fundador ya sellado

  v_hasta := (
    date_trunc('day', (now() at time zone v_zona)
      + make_interval(days => public.founder_days_for(v_pais)))
    + interval '23 hours 59 minutes'
  ) at time zone v_zona;
  v_tope  := public.founder_country_deadline(v_pais);
  if v_tope is not null and v_hasta > v_tope then v_hasta := v_tope; end if;

  update public.directorio_invitaciones set fundador_hasta = v_hasta where token = p_token;
  return v_hasta;
end $function$;
