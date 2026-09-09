-- ============================================================================
-- 0097 · campaign_reminder_queue: dos fallos en la misma función
--
-- 1) Reventaba en tiempo de ejecución. La función declara `email text` pero
--    devuelve `auth.users.email`, que es varchar(255); en plpgsql el
--    RETURN QUERY no acepta ese desajuste y aborta con
--      "structure of query does not match function result type".
--    La edge function campaign-emails desestructura solo `data` de la RPC,
--    así que el error se perdía y la cola parecía vacía. Nunca salió un solo
--    recordatorio. Se corrige con ::text en las tres columnas de texto.
--
-- 2) Le habría cobrado a quien no debe. El filtro excluía únicamente
--    provider_type = 'company'. Un DIF estatal está clasificado como 'clinic',
--    de modo que en cuanto la función volviera a correr, los organismos
--    públicos habrían recibido el recordatorio de pago: exactamente el error
--    que ya corregimos en campaign_welcome_queue. Ahora se apoya en el sector
--    del directorio, igual que aquella, y exige sector = 'privado'.
--
-- Esto no manda ningún correo por sí solo: el cron nm-campaign-emails (jobid
-- 10) sigue desactivado.
-- ============================================================================

create or replace function public.campaign_reminder_queue()
returns table(user_id uuid, email text, name text, country text, pct integer, opens_at timestamp with time zone)
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare c public.campaign_config%rowtype; v_pct integer;
begin
  select * into c from public.campaign_config where id = 1;
  if not found or not c.active then return; end if;

  select coalesce((
    select (s->>'pct')::int
    from jsonb_array_elements(c.founder_discount) s
    where (extract(epoch from (now() - c.start_at)) / 86400.0) <= (s->>'days')::int
    order by (s->>'days')::int asc
    limit 1
  ), 0) into v_pct;

  return query
  select ce.user_id,
         u.email::text,
         coalesce(nullif(p.business_name, ''), nullif(p.full_name, ''), 'Miembro')::text,
         p.country::text,
         v_pct,
         c.start_at + (coalesce((c.block_days_by_country->>p.country)::int, c.default_block_days) || ' days')::interval
  from public.campaign_emails ce
  join public.profiles p on p.id = ce.user_id
  join auth.users u on u.id = ce.user_id
  left join public.directorio d on d.reclamada_por = p.id
  where u.email is not null
    and p.role = 'provider'
    -- Nadie que esté exento paga, así que nadie que esté exento recibe un
    -- recordatorio de pago.
    and coalesce(p.provider_type::text, '') not in ('company', 'ngo')
    and coalesce(d.sector, 'privado') = 'privado'
    and coalesce(p.membership_status, '') in ('pending', 'past_due')
    and (ce.last_reminder_at is null or ce.last_reminder_at < now() - interval '5 days')
    and now() < c.start_at + (coalesce((c.block_days_by_country->>p.country)::int, c.default_block_days) || ' days')::interval
  limit 200;
end; $function$;
