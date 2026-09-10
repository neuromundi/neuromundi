-- ============================================================================
-- 0103 · affiliate_earnings acotada al dueño (cierra fuga horizontal)
--
-- La vista es SECURITY DEFINER (sin security_invoker), así que salta RLS: en
-- 0100 se le quitó el grant a anon, pero cualquier usuario `authenticated`
-- podía leer las ventas/comisiones agregadas de TODOS los afiliados, no solo
-- las suyas. El panel del comerciante (useShop) ya la consulta filtrada por
-- `affiliate_id = su id`, así que añadir el mismo filtro dentro de la vista es
-- transparente para el front y cierra la fuga. Se conserva el acceso del admin
-- vía is_admin() por si algún panel la usa sin filtrar.
--
-- create or replace view conserva columnas y orden (solo cambia el WHERE).
-- Idempotente.
-- ============================================================================

create or replace view public.affiliate_earnings as
  select affiliate_id,
         count(*)::integer as sales,
         sum(commission_cents) as commission_cents_total,
         currency
  from public.orders
  where status = 'paid'
    and affiliate_id is not null
    and (affiliate_id = (select auth.uid()) or public.is_admin())
  group by affiliate_id, currency;
