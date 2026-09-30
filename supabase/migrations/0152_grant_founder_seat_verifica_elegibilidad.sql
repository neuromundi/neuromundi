-- ============================================================================
-- 0152 · grant_founder_seat debe verificar ELEGIBILIDAD, no sólo cupo
--
-- DEFECTO ENCONTRADO AL PROBAR 0150
--   `grant_founder_seat()` sólo comprobaba que quedara cupo. Probada contra un
--   perfil sin país —que `founder_eligible()` rechaza correctamente— la función
--   otorgó el asiento de todas formas y devolvió true.
--
-- POR QUÉ IMPORTA
--   La llama el webhook de Stripe cuando la metadata de la sesión dice
--   `member_class = 'founder'`. Esa metadata se fija cuando se CREA la sesión
--   de checkout, y el pago puede completarse mucho después (una sesión de
--   Stripe vive horas). En ese intervalo el plazo de fundador puede vencer o el
--   cupo puede llenarse, y el asiento se otorgaba igual.
--
--   Además dejaba filas con `country` nulo, que rompen la contabilidad de cupo
--   por país en cuanto se añada un segundo país.
--
-- QUÉ HACE
--   Antepone `founder_eligible()`, que ya comprueba baja voluntaria, cupo,
--   plazo del país y país presente. La comprobación de cupo se conserva como
--   segunda barrera: `founder_eligible` es STABLE y podría leer una foto
--   ligeramente vieja dentro de la misma transacción.
--
--   `founder_eligible` devuelve true de inmediato para quien ya es fundador, y
--   esa rama la atiende el early-return de arriba, así que un fundador
--   existente sigue siendo idempotente.
--
-- Idempotente. NO envía nada.
-- ============================================================================

create or replace function public.grant_founder_seat(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_kind text; v_country text; v_usados int;
begin
  -- Ya lo tiene: idempotente.
  if exists (select 1 from public.founder_members where user_id = p_id) then
    return true;
  end if;

  -- Debe cumplir las MISMAS condiciones con las que se le cotizó el precio.
  if not public.founder_eligible(p_id) then
    return false;
  end if;

  v_kind := public.founder_kind_for(p_id);
  if v_kind is null then return false; end if;

  select p.country into v_country from public.profiles p where p.id = p_id;

  select count(*) into v_usados from public.founder_members where kind = v_kind;
  if v_usados >= public.founder_capacity(v_kind) then return false; end if;

  insert into public.founder_members (user_id, kind, country, grace_until)
  values (p_id, v_kind, v_country, now() + interval '3 months')
  on conflict (user_id) do nothing;
  return true;
end $$;

revoke all on function public.grant_founder_seat(uuid) from public, anon, authenticated;
