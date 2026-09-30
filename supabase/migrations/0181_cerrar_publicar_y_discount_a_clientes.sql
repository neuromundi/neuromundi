-- ============================================================================
-- 0181 — Cerrar a clientes publicar_si_procede y membership_discount(uuid)
--
-- publicar_si_procede escribe is_published sobre un uuid arbitrario; membership_discount(uuid)
-- lee el descuento de un uuid arbitrario. Ninguna se usa desde el front (el front
-- publica con la casilla + su trigger gate, y usa my_membership_discount para su
-- propio %). Las RPC SECURITY DEFINER internas que las invocan (reclamo,
-- reactivación, checkout) corren como su dueño y no se ven afectadas.
-- Idempotente. Aplicada en producción 2026-09-30.
-- ============================================================================

revoke all on function public.publicar_si_procede(uuid) from public, anon, authenticated;
revoke all on function public.membership_discount(uuid) from public, anon, authenticated;
grant execute on function public.publicar_si_procede(uuid) to service_role;
grant execute on function public.membership_discount(uuid) to service_role;
