-- ============================================================================
-- Rendimiento de base de datos. Ya APLICADO en producción; esta migración deja
-- el repositorio sincronizado y documenta el porqué.
--
-- 1) Índices duplicados. Dos pares con definiciones LITERALMENTE idénticas
--    (verificado en pg_indexes antes de borrar). Duplicaban el coste de cada
--    INSERT/UPDATE sin aportar nada a las lecturas. Se conserva en cada par el
--    del nombre convencional y se elimina el 'idx_*'.
--
-- 2) auth.uid() en políticas RLS. 146 de 193 políticas llamaban a
--    auth.uid()/auth.role()/auth.jwt() sin envolver, lo que hace que Postgres
--    las evalúe UNA VEZ POR FILA. Envolverlas en (select ...) las convierte en
--    un InitPlan que se evalúa UNA vez por consulta. Es semánticamente
--    idéntico y es la optimización que recomienda Supabase.
--
--    Se usó ALTER POLICY (no DROP+CREATE) para no perder nombre, tabla, roles
--    ni comando. Verificado después de aplicar:
--      · 0 políticas pendientes, 193 en total (ninguna perdida)
--      · 0 diferencias de tabla/nombre/comando/roles frente al respaldo
--      · pruebas reales contra la API con la clave anónima: profiles
--        (3 filas) y membership_fees (9 filas) siguen devolviendo vacío
--      · el advisor de Supabase ya no reporta auth_rls_initplan
--
--    Respaldo previo en public._rls_backup_20260902 (con RLS activo). Se puede
--    eliminar cuando haya confianza en el cambio:
--      drop table public._rls_backup_20260902;
--
-- NOTA para futuras políticas: escribe (select auth.uid()) desde el principio,
-- no auth.uid() a secas, o volverá a aparecer el aviso.
-- ============================================================================

drop index if exists public.idx_posts_keywords;
drop index if exists public.idx_courses_author;

do $$
declare r record; nq text; nc text; sql text;
begin
  for r in
    select tablename, policyname, qual, with_check
    from pg_policies where schemaname='public'
      and ( (qual ~ 'auth\.(uid|role|jwt)\(\)' and qual !~ 'SELECT auth\.')
         or (with_check ~ 'auth\.(uid|role|jwt)\(\)' and with_check !~ 'SELECT auth\.') )
  loop
    nq := r.qual; nc := r.with_check;
    if nq is not null then
      nq := replace(nq, '( SELECT auth.uid() AS uid)', '@@W@@');
      nq := regexp_replace(nq, 'auth\.uid\(\)', '(select auth.uid())', 'g');
      nq := regexp_replace(nq, 'auth\.role\(\)', '(select auth.role())', 'g');
      nq := regexp_replace(nq, 'auth\.jwt\(\)', '(select auth.jwt())', 'g');
      nq := replace(nq, '@@W@@', '( SELECT auth.uid() AS uid)');
    end if;
    if nc is not null then
      nc := replace(nc, '( SELECT auth.uid() AS uid)', '@@W@@');
      nc := regexp_replace(nc, 'auth\.uid\(\)', '(select auth.uid())', 'g');
      nc := regexp_replace(nc, 'auth\.role\(\)', '(select auth.role())', 'g');
      nc := regexp_replace(nc, 'auth\.jwt\(\)', '(select auth.jwt())', 'g');
      nc := replace(nc, '@@W@@', '( SELECT auth.uid() AS uid)');
    end if;
    sql := format('alter policy %I on public.%I', r.policyname, r.tablename);
    if nq is not null then sql := sql || format(' using (%s)', nq); end if;
    if nc is not null then sql := sql || format(' with check (%s)', nc); end if;
    execute sql;
  end loop;
end $$;
