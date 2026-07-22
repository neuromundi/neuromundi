-- ============================================================================
-- Carga y descarga masiva de cuotas por país (CSV)
-- ----------------------------------------------------------------------------
-- El panel exporta todas las cuotas configuradas a CSV y permite volver a
-- subirlas editadas. La importación entra en UNA sola transacción: si algo
-- falla, no queda medio aplicada.
--
-- El país se guarda con normalize_country(), así que da igual si el archivo
-- dice "México", "Mexico" o "MEXICO". Idempotente. Requiere 0041.
-- ============================================================================

-- Todas las cuotas EXPLÍCITAS, para exportarlas. No incluye las calculadas
-- automáticamente: el CSV es la lista de lo que el admin fijó a mano.
create or replace function public.admin_export_membership_prices()
returns table (
  country_label text,
  affiliate_type text,
  member_class text,
  currency text,
  monthly_amount numeric,
  annual_amount numeric,
  annual_list_amount numeric,
  zero_decimal boolean
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query
  select mp.country_label, mp.affiliate_type, mp.member_class, mp.currency,
         mp.monthly_amount, mp.annual_amount, mp.annual_list_amount, mp.zero_decimal
  from public.membership_prices mp
  where mp.is_active = true
  order by mp.country_label, mp.affiliate_type, mp.member_class desc;
end; $$;
revoke all on function public.admin_export_membership_prices() from public, anon;
grant execute on function public.admin_export_membership_prices() to authenticated;

-- Importación masiva. Recibe un arreglo JSON con la forma:
--   [{"pais":"México","tipo":"medical_specialist","clase":"founder",
--     "moneda":"MXN","mensual":1000,"anual":10000,
--     "anual_referencia":12000,"sin_centavos":false}, ...]
--
-- p_replace = true borra las cuotas que NO vengan en el archivo (sincronización
-- completa); false solo agrega y actualiza (mezcla). Se devuelve el conteo para
-- que el panel informe con precisión qué ocurrió.
create or replace function public.admin_import_membership_prices(
  p_rows jsonb,
  p_replace boolean default false
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_row jsonb;
  v_country text;
  v_type text;
  v_class text;
  v_monthly numeric;
  v_annual numeric;
  v_list numeric;
  v_inserted int := 0;
  v_updated int := 0;
  v_deleted int := 0;
  v_existed boolean;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    return json_build_object('ok', false, 'error', 'bad_payload');
  end if;

  -- Marca de paso para saber qué filas vinieron en este archivo.
  create temporary table if not exists _import_keys (
    affiliate_type text, country_label text, member_class text
  ) on commit drop;
  delete from _import_keys;

  for v_row in select * from jsonb_array_elements(p_rows) loop
    v_country := public.normalize_country(v_row ->> 'pais');
    v_type := btrim(coalesce(v_row ->> 'tipo', ''));
    v_class := case when (v_row ->> 'clase') = 'founder' then 'founder' else 'ordinary' end;
    v_monthly := nullif(v_row ->> 'mensual', '')::numeric;
    v_annual := nullif(v_row ->> 'anual', '')::numeric;
    v_list := nullif(v_row ->> 'anual_referencia', '')::numeric;

    if v_country = '' or v_type = '' or v_monthly is null or v_monthly < 0 then
      continue;  -- el cliente ya validó; aquí solo se ignora lo inservible
    end if;
    if v_annual is null then v_annual := round(v_monthly * 10, 2); end if;
    if v_list is null then v_list := round(v_monthly * 12, 2); end if;

    select true into v_existed from public.membership_prices mp
     where mp.affiliate_type = v_type and mp.country_label = v_country
       and mp.member_class = v_class;

    insert into public.membership_prices (
      affiliate_type, country_label, member_class, currency,
      monthly_amount, annual_amount, annual_list_amount, amount, zero_decimal, updated_at
    ) values (
      v_type, v_country, v_class, upper(btrim(coalesce(v_row ->> 'moneda', 'USD'))),
      v_monthly, v_annual, v_list, v_annual,
      coalesce((v_row ->> 'sin_centavos')::boolean, false), now()
    )
    on conflict (affiliate_type, country_label, member_class) do update
      set currency = excluded.currency,
          monthly_amount = excluded.monthly_amount,
          annual_amount = excluded.annual_amount,
          annual_list_amount = excluded.annual_list_amount,
          amount = excluded.amount,
          zero_decimal = excluded.zero_decimal,
          is_active = true,
          updated_at = now();

    if coalesce(v_existed, false) then v_updated := v_updated + 1;
    else v_inserted := v_inserted + 1; end if;
    v_existed := null;

    insert into _import_keys values (v_type, v_country, v_class);
  end loop;

  if p_replace then
    delete from public.membership_prices mp
    where not exists (
      select 1 from _import_keys k
      where k.affiliate_type = mp.affiliate_type
        and k.country_label = mp.country_label
        and k.member_class = mp.member_class
    );
    get diagnostics v_deleted = row_count;
  end if;

  return json_build_object(
    'ok', true,
    'inserted', v_inserted,
    'updated', v_updated,
    'deleted', v_deleted
  );
end; $$;
revoke all on function public.admin_import_membership_prices(jsonb, boolean) from public, anon;
grant execute on function public.admin_import_membership_prices(jsonb, boolean) to authenticated;
