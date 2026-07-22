-- ============================================================================
-- Opciones de cuota del usuario en sesión (lo que verá en el modal de pago)
-- ----------------------------------------------------------------------------
-- Resuelve de una sola vez las tres variables que definen cuánto paga alguien:
--   · TIPO  → affiliate_type_for(): separa especialista médico de no médico
--             según su profesión (o el override del admin).
--   · CLASE → is_founder(): fundador u ordinaria.
--   · PAÍS  → el de su perfil, con respaldo en 'default'.
-- Devuelve AMBAS periodicidades para que el usuario elija con el ahorro a la
-- vista. Idempotente. Requiere 0038 y 0039.
-- ============================================================================

create or replace function public.my_membership_options()
returns table (
  affiliate_type text,
  member_class text,
  currency text,
  monthly_amount numeric,
  annual_amount numeric,
  annual_list_amount numeric,
  zero_decimal boolean,
  is_founder boolean
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_me uuid := auth.uid();
  v_type text;
  v_founder boolean;
  v_class text;
  v_country text;
begin
  if v_me is null then return; end if;

  v_type := public.affiliate_type_for(v_me);
  v_founder := coalesce(public.is_founder(v_me), false);
  v_class := case when v_founder then 'founder' else 'ordinary' end;
  select p.country into v_country from public.profiles p where p.id = v_me;

  return query
  select v_type, v_class, pr.currency,
         pr.monthly_amount, pr.annual_amount, pr.annual_list_amount,
         pr.zero_decimal, v_founder
  from public.membership_price_for(v_type, coalesce(v_country, ''), v_class, 'annual') pr;
end; $$;
revoke all on function public.my_membership_options() from public, anon;
grant execute on function public.my_membership_options() to authenticated;
