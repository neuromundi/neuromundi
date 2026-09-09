-- ============================================================================
-- 0100 · Cierre de vistas SECURITY DEFINER legibles por anon (auditoría 2026-09-09)
--
-- Las vistas de public sin `security_invoker=on` corren con los privilegios del
-- dueño (postgres) y saltan la RLS de las tablas base. Dos quedaron expuestas:
--
--  · revision_campana_20260908: vista de revisión del incidente del 2026-09-08.
--    Expone PII (nombre, correo, teléfono de 77 contactados) y era legible por
--    anon/authenticated. No la usa el front. La cerramos por completo (queda
--    accesible solo por service_role / SQL Editor para el registro del incidente).
--
--  · affiliate_earnings: ventas y comisiones agregadas por afiliado. El panel del
--    comerciante la consulta SIEMPRE filtrada por affiliate_id = su propio id
--    (useShop), así que `authenticated` la necesita; pero NO debe ser legible por
--    anon. Quitamos solo el grant anónimo.
--    (Pendiente recomendado: como es vista definer, un autenticado podría leer las
--     de otros; conviene migrarla a RPC filtrada por auth.uid o a security_invoker
--     con política. Se deja para un cambio coordinado front+base.)
--
-- Idempotente.
-- ============================================================================
do $$
begin
  if to_regclass('public.revision_campana_20260908') is not null then
    execute 'revoke all on table public.revision_campana_20260908 from anon, authenticated';
  end if;
  if to_regclass('public.affiliate_earnings') is not null then
    execute 'revoke all on table public.affiliate_earnings from anon';
  end if;
end $$;
