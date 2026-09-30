-- ============================================================================
-- 0176 — El admin puede AJUSTAR o QUITAR la prórroga (vencimiento absoluto)
--
-- `admin_member_extend` solo suma/resta días relativos; no hay forma clara de
-- "quitar" una prórroga ya concedida. Esta función fija el vencimiento a una
-- FECHA absoluta, o a NULL para quitarlo (el miembro queda vencido de inmediato).
--
-- Ajusta el estado en consecuencia: si el nuevo vencimiento ya pasó (o es null) y
-- estaba 'active' → 'past_due'; si queda a futuro y estaba 'past_due' → 'active'.
-- No toca 'exempt' ni 'pending' (esos no dependen del vencimiento pagado).
-- Registra la acción como 'extend' (misma categoría de bitácora).
--
-- Idempotente.
-- ============================================================================

create or replace function public.admin_member_set_expiry(
  p_user uuid, p_fecha timestamptz, p_nota text default null
)
returns timestamptz
language plpgsql security definer set search_path to 'public'
as $function$
declare v_status text;
begin
  if not public.is_admin() then raise exception 'solo administradores'; end if;
  select membership_status into v_status from public.profiles where id = p_user;
  if not found then raise exception 'perfil no encontrado'; end if;

  update public.profiles
     set membership_paid_until = p_fecha,
         membership_status = case
           when v_status = 'active'   and (p_fecha is null or p_fecha <= now()) then 'past_due'
           when v_status = 'past_due' and p_fecha is not null and p_fecha > now() then 'active'
           else v_status end
   where id = p_user;

  perform public.admin_log_account_action(p_user, 'extend',
    coalesce(p_nota, '') || case when p_fecha is null then ' [quitar prórroga]'
                                 else ' [vencimiento: ' || to_char(p_fecha,'YYYY-MM-DD') || ']' end);
  return p_fecha;
end $function$;

revoke all on function public.admin_member_set_expiry(uuid, timestamptz, text) from public, anon;
grant execute on function public.admin_member_set_expiry(uuid, timestamptz, text) to authenticated;
