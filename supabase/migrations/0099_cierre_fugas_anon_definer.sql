-- ============================================================================
-- 0099 · Cierre de fugas detectadas en la auditoría (2026-09-09)
--
-- Contexto: en Supabase, TODA función creada por `postgres` en el esquema
-- `public` recibe por defecto EXECUTE para `anon, authenticated, service_role`.
-- Por eso `revoke ... from public` NO basta para una función definer que solo
-- debe llamar el service_role: hay que revocar explícitamente de anon/authenticated.
--
-- Idempotente (guardas con to_regprocedure / to_regclass).
-- ============================================================================

-- 1) campaign_welcome_queue(): un DROP+CREATE en 0096 borró el ACL restringido
--    que 0083 le había puesto (service_role only), y la función volvió a quedar
--    ejecutable por anon/authenticated. Es SECURITY DEFINER y devuelve el correo
--    (auth.users.email) de todos los inscritos a la campaña → cosecha de PII con
--    la sola clave anónima. La restringimos de nuevo a service_role.
do $$
begin
  if to_regprocedure('public.campaign_welcome_queue()') is not null then
    revoke all on function public.campaign_welcome_queue() from public, anon, authenticated;
    grant execute on function public.campaign_welcome_queue() to service_role;
  end if;
end $$;

-- 2) marcar_ficha_reclamada(text, uuid): pensada SOLO para la Edge Function
--    `reclamar-ficha` (service_role). 0093 solo revocó de PUBLIC, así que anon/
--    authenticated conservaban el grant por defecto y podían forjar el reclamo de
--    una ficha hacia un perfil arbitrario con un token vivo.
do $$
begin
  if to_regprocedure('public.marcar_ficha_reclamada(text, uuid)') is not null then
    revoke all on function public.marcar_ficha_reclamada(text, uuid) from public, anon, authenticated;
    grant execute on function public.marcar_ficha_reclamada(text, uuid) to service_role;
  end if;
end $$;

-- 3) respaldo_bitacora: tabla de bitácora de limpieza (tabla, filas, resumen,
--    eliminada_en). Quedó en `public` SIN RLS y legible por anon. Sin PII, pero
--    es una tabla interna que no debe exponerse. Encendemos RLS sin políticas
--    (nadie salvo service_role/definer la lee) y revocamos el grant a clientes.
do $$
begin
  if to_regclass('public.respaldo_bitacora') is not null then
    execute 'alter table public.respaldo_bitacora enable row level security';
    execute 'revoke all on table public.respaldo_bitacora from anon, authenticated';
  end if;
end $$;
