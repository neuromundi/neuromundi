-- ============================================================================
-- 0198 — Importación de cuotas por CSV: reescritura SET-BASED (rápida)
--
-- La versión por bucle (0042/0197) recorría fila por fila: con tablas completas
-- (24 países × 10 tipos × 2 clases = 480 filas) excedía el statement_timeout de
-- 8 s de la API de Supabase y hacía rollback —la UI reportaba "éxito" pero no
-- guardaba nada—. Esta versión hace TODO en una sola sentencia:
--   · parsea el JSON con jsonb_array_elements,
--   · deduplica por clave primaria (evita el error "cannot affect row a second time"),
--   · upsert masivo con ON CONFLICT,
--   · cuenta insertadas vs actualizadas con el truco de xmax,
--   · el borrado de "reemplazar todo" usa NOT EXISTS (con WHERE, apto para safeupdate).
-- Sin tabla temporal ni DELETE sin WHERE. Idempotente.
-- ============================================================================
create or replace function public.admin_import_membership_prices(
  p_rows jsonb,
  p_replace boolean default false
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_inserted int := 0;
  v_updated  int := 0;
  v_deleted  int := 0;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    return json_build_object('ok', false, 'error', 'bad_payload');
  end if;

  -- Por si llega un archivo muy grande: la función corre como definer y puede
  -- ampliar su propio límite (la API lo deja en 8 s).
  set local statement_timeout = '60s';

  with src as (
    select
      public.normalize_country(e ->> 'pais')                              as country_label,
      btrim(coalesce(e ->> 'tipo', ''))                                   as affiliate_type,
      case when e ->> 'clase' = 'founder' then 'founder' else 'ordinary' end as member_class,
      upper(btrim(coalesce(e ->> 'moneda', 'USD')))                       as currency,
      nullif(e ->> 'mensual', '')::numeric                               as monthly,
      nullif(e ->> 'anual', '')::numeric                                 as annual_in,
      nullif(e ->> 'anual_referencia', '')::numeric                      as list_in,
      (lower(btrim(coalesce(e ->> 'sin_centavos', '')))
         in ('true','t','1','si','sí','yes','x'))                         as zero_decimal
    from jsonb_array_elements(p_rows) as e
  ),
  valid as (
    select country_label, affiliate_type, member_class, currency,
           monthly,
           coalesce(annual_in, round(monthly * 10, 2)) as annual_amount,
           coalesce(list_in,   round(monthly * 12, 2)) as annual_list_amount,
           zero_decimal
    from src
    where country_label <> '' and affiliate_type <> '' and monthly is not null and monthly >= 0
  ),
  dedup as (
    -- Si el archivo trae la misma clave repetida, conserva la última aparición.
    select distinct on (affiliate_type, country_label, member_class) *
    from valid
    order by affiliate_type, country_label, member_class
  ),
  ins as (
    insert into public.membership_prices as mp (
      affiliate_type, country_label, member_class, currency,
      monthly_amount, annual_amount, annual_list_amount, amount, zero_decimal, is_active, updated_at
    )
    select affiliate_type, country_label, member_class, currency,
           monthly, annual_amount, annual_list_amount, annual_amount, zero_decimal, true, now()
    from dedup
    on conflict (affiliate_type, country_label, member_class) do update
      set currency = excluded.currency,
          monthly_amount = excluded.monthly_amount,
          annual_amount = excluded.annual_amount,
          annual_list_amount = excluded.annual_list_amount,
          amount = excluded.amount,
          zero_decimal = excluded.zero_decimal,
          is_active = true,
          updated_at = now()
    returning (xmax = 0) as was_insert
  )
  select count(*) filter (where was_insert),
         count(*) filter (where not was_insert)
    into v_inserted, v_updated
  from ins;

  if p_replace then
    delete from public.membership_prices mp
    where not exists (
      select 1 from jsonb_array_elements(p_rows) e
      where mp.affiliate_type = btrim(coalesce(e ->> 'tipo', ''))
        and mp.country_label  = public.normalize_country(e ->> 'pais')
        and mp.member_class   = case when e ->> 'clase' = 'founder' then 'founder' else 'ordinary' end
    );
    get diagnostics v_deleted = row_count;
  end if;

  return json_build_object('ok', true, 'inserted', v_inserted, 'updated', v_updated, 'deleted', v_deleted);
end; $$;
revoke all on function public.admin_import_membership_prices(jsonb, boolean) from public, anon;
grant execute on function public.admin_import_membership_prices(jsonb, boolean) to authenticated;
