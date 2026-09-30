-- ============================================================================
-- 0180 — Cerrar a clientes RPC sensibles (patrón del hallazgo 2)
--
-- Funciones SECURITY DEFINER que actuaban sobre un uuid arbitrario y eran
-- ejecutables por authenticated (ninguna se llama desde el front; solo el webhook
-- con service_role):
--   set_membership_active   -> daba membresía activa gratis a cualquier id (crítico).
--   consume_referral_credit -> ponía en 0 el crédito de recomendación de cualquiera.
--   grant_referral_credit   -> disparaba el otorgamiento de crédito.
-- Se restringen a service_role. Idempotente. Aplicada en producción 2026-09-30.
-- ============================================================================

revoke all on function public.set_membership_active(uuid, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.grant_referral_credit(uuid) from public, anon, authenticated;
revoke all on function public.consume_referral_credit(uuid) from public, anon, authenticated;

grant execute on function public.set_membership_active(uuid, text, text, timestamptz) to service_role;
grant execute on function public.grant_referral_credit(uuid) to service_role;
grant execute on function public.consume_referral_credit(uuid) to service_role;
