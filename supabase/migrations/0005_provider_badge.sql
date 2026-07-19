-- ============================================================================
-- Distintivo oficial: insumos por proveedor (para el motor de puntuación)
-- ----------------------------------------------------------------------------
-- Reúne en una sola vista todo lo que el cálculo del distintivo necesita:
--   * Validación documental (Filtro Cero)     ← profiles.is_verified
--   * Promedios de reseñas y EVS (1–5)         ← public_provider_ratings
--   * Mejor descuento porcentual vigente       ← offers (discount_type='percentage')
--   * Aporte de contenido                      ← content_posts publicados
--   * Tasa de respuesta / retención            ← PENDIENTE (aún sin fuente → 0)
--
-- El puntaje y el nivel se calculan en la app (src/lib/badge.ts), fuente única
-- de la lógica. Esta vista solo entrega datos NO sensibles y agregados, de
-- proveedores publicados, para poder mostrar el distintivo en público.
-- Idempotente.
-- ============================================================================

create or replace view public.provider_badge_inputs
  with (security_invoker = off) as   -- corre con privilegios del owner: expone
                                      -- solo agregados públicos de proveedores publicados
select
  p.id                                   as provider_id,
  coalesce(p.is_verified, false)         as documental_verified,
  r.avg_quality                          as avg_quality,
  r.avg_human_treatment                  as avg_human_treatment,
  r.avg_professionalism                  as avg_professionalism,
  r.evs_score                            as evs_score,
  coalesce(r.total_reviews, 0)::int      as total_reviews,
  coalesce((
    select max(o.discount_value)
    from public.offers o
    where o.provider_id = p.id
      and o.discount_type = 'percentage'
      and o.discount_value is not null
      and (o.valid_from  is null or o.valid_from  <= now())
      and (o.valid_until is null or o.valid_until >= now())
  ), 0)::numeric                         as discount_pct,
  coalesce((
    select count(*)
    from public.content_posts cp
    where cp.author_id = p.id
      and cp.is_published = true
  ), 0)::int                             as content_count,
  0::numeric                             as response_rate_pct,  -- TODO: fuente de datos
  0::numeric                             as retention_pct       -- TODO: fuente de datos
from public.profiles p
left join public.public_provider_ratings r on r.provider_id = p.id
where p.role = 'provider'
  and p.is_published = true;

-- Lectura pública (el distintivo se muestra en el directorio y perfiles).
grant select on public.provider_badge_inputs to anon, authenticated;

-- ── Cómo poblar las métricas pendientes (sugerencia) ─────────────────────────
-- response_rate_pct: % de conversaciones/citas respondidas dentro de X horas
--   (se puede calcular desde appointments / mensajería cuando exista la señal).
-- retention_pct: % de pacientes que regresan (2+ citas) sobre el total, desde
--   appointments. Cuando definas la fuente, reemplaza los 0 por el subselect
--   correspondiente y el motor los tomará automáticamente.
