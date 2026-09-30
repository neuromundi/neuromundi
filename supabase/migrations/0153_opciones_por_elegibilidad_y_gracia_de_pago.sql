-- ============================================================================
-- 0153 · La pantalla de pago usa ELEGIBILIDAD, y el fundador que pagó no caduca
--
-- Dos defectos que dejó 0150 al mover el asiento de fundador al momento del
-- pago. Ninguno se ve en el diff de 0150: viven en código que no se tocó y que
-- dependía del que sí.
--
-- ── 1. `my_membership_options` seguía usando `is_founder()` ──────────────────
--
--    Es la función que alimenta el modal de pago (useMembership →
--    MembershipModal). Como el asiento ahora se otorga DESPUÉS de pagar,
--    `is_founder()` es falso para todo invitado al abrir el modal, así que la
--    pantalla mostraba la tarifa ORDINARIA mientras el checkout cobraba la de
--    FUNDADOR.
--
--    Para una clínica: el correo promete 5,000, el modal mostraba 10,000 y
--    Stripe cobraba 5,000. No se cobraba de más, pero el invitado veía el doble
--    de lo prometido por escrito y se iba antes de pagar.
--
--    Ahora usa `founder_eligible()`, la misma que el checkout, así que la
--    pantalla y el cobro no pueden discrepar.
--
-- ── 2. `grace_until` borraba al fundador que SÍ pagó ─────────────────────────
--
--    `grant_founder_seat` insertaba `grace_until = now() + 3 meses`, que era la
--    semántica del modelo viejo: reclamas gratis y tienes tres meses para
--    completar el perfil. En el modelo nuevo la fila sólo existe si HUBO PAGO.
--
--    `purge_lapsed_founders()` borra el asiento cuando vence la gracia y el
--    perfil no tiene avatar, biografía y teléfono. O sea que quien pagó 5,000
--    en octubre y no subió foto perdía la insignia en enero, mientras el correo
--    le prometió «beneficios preferentes de por vida».
--
--    Ahora el asiento otorgado por pago nace con `grace_until = null`, y la
--    purga lo ignora: su primera condición es `grace_until is not null`.
--    La purga conserva su sentido para los asientos heredados del modelo
--    anterior, que sí tienen fecha.
--
-- Idempotente. NO envía nada.
-- ============================================================================

create or replace function public.my_membership_options()
returns table(affiliate_type text, member_class text, currency text,
              monthly_amount numeric, annual_amount numeric,
              annual_list_amount numeric, zero_decimal boolean, is_founder boolean)
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
  -- ELEGIBILIDAD, no tenencia: el asiento se otorga tras el pago, así que
  -- is_founder() sería falso aquí para todo el que aún no ha pagado.
  v_founder := coalesce(public.founder_eligible(v_me), false);
  v_class := case when v_founder then 'founder' else 'ordinary' end;
  select p.country into v_country from public.profiles p where p.id = v_me;

  return query
  select v_type, v_class, pr.currency,
         pr.monthly_amount, pr.annual_amount, pr.annual_list_amount,
         pr.zero_decimal, v_founder
  from public.membership_price_for(v_type, coalesce(v_country, ''), v_class, 'annual') pr;
end; $$;

create or replace function public.grant_founder_seat(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_kind text; v_country text; v_usados int;
begin
  if exists (select 1 from public.founder_members where user_id = p_id) then
    return true;
  end if;
  if not public.founder_eligible(p_id) then
    return false;
  end if;

  v_kind := public.founder_kind_for(p_id);
  if v_kind is null then return false; end if;

  select p.country into v_country from public.profiles p where p.id = p_id;

  select count(*) into v_usados from public.founder_members where kind = v_kind;
  if v_usados >= public.founder_capacity(v_kind) then return false; end if;

  -- grace_until NULL: este asiento se ganó pagando, no reclamando. La purga
  -- sólo toca filas con fecha de gracia, así que este no caduca. El correo
  -- promete «beneficios preferentes de por vida» y esto lo cumple.
  insert into public.founder_members (user_id, kind, country, grace_until)
  values (p_id, v_kind, v_country, null)
  on conflict (user_id) do nothing;
  return true;
end $$;

revoke all on function public.grant_founder_seat(uuid) from public, anon, authenticated;
