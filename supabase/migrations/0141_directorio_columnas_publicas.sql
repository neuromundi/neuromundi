-- ============================================================================
-- 0141 — Cerrar la exposición de `correo` (y otros campos internos) en directorio
--
-- Problema: anon y authenticated tenían GRANT SELECT (además de INSERT/UPDATE/
-- REFERENCES) sobre TODAS las columnas de public.directorio. La política
-- `directorio_lectura_publica` deja leer las filas publicadas, así que cualquiera
-- con la llave publicable (VITE_SUPABASE_ANON_KEY, visible en el bundle) podía
-- descargar `correo`, `notas`, `sector`, etc. de las 728 fichas — una lista
-- scrapeable de correos del sector (materia de la LFPDPPP y de reputación).
--
-- Las escrituras ya estaban bloqueadas por RLS (solo `is_admin()` permite ALL),
-- pero el GRANT de INSERT/UPDATE sobraba: se revoca también por defensa en
-- profundidad.
--
-- El front NO consulta la tabla directamente: usa la vista `directorio_publico`
-- (security_invoker) y RPCs SECURITY DEFINER (`ficha_por_token`,
-- `solicitar_baja_ficha`, admin_*), que corren como su dueño y NO dependen de
-- estos grants. La vista solo referencia 24 columnas de `directorio` (ninguna es
-- `correo`), así que basta con otorgar SELECT de esas columnas.
--
-- OJO: si una migración futura añade a la VISTA una columna nueva de `directorio`,
-- hay que añadir esa columna a este GRANT o la vista dejará de resolver para anon.
-- Los grants a nivel de columna NO se heredan a columnas nuevas (secure by default).
--
-- Idempotente.
-- ============================================================================

revoke all on public.directorio from anon, authenticated;

grant select (
  id, nombre, telefono, sitio_web, direccion, ciudad, estado,
  especializacion, lat, lng, creada_en, actualizada_en,
  estado_revision, baja_solicitada, reclamada_por, clee,
  provider_type, provider_types, sections,
  profession, specialties, intervention_areas, neuro_conditions,
  product_categories
) on public.directorio to anon, authenticated;
