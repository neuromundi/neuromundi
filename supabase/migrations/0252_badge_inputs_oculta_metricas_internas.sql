-- ============================================================================
-- 0252 — N-1 (auditoría 16 oct): la vista provider_badge_inputs filtraba
-- métricas internas de cada prestador a cualquiera (anon incluido).
--
-- La vista es SECURITY DEFINER y el front la consulta directo (useDirectory,
-- useProviderBadge) para calcular el distintivo en el cliente. Exponía, por cada
-- prestador publicado, `response_rate_pct` y `retention_pct`: inteligencia
-- competitiva que NO se muestra en ninguna pantalla pública.
--
-- Clave: el NIVEL del distintivo (el sello público) NO usa esas dos métricas
-- (solo depende de descuento, calificación, empatía, verificación y antigüedad;
-- ver computeBadge en src/lib/badge.ts). Solo alimentan el bloque "compromiso"
-- que se muestra únicamente en el panel del DUEÑO (BadgeProgress) y del ADMIN.
--
-- Arreglo de mínimo riesgo: las dos columnas devuelven su valor real SOLO al
-- dueño o a un admin; a cualquier otro (anon u otro usuario) devuelven 0. El
-- sello público queda idéntico y la fuga se cierra. Sin cambios en el front, el
-- motor JS, los tipos ni los hooks. Idempotente (create or replace, mismas
-- columnas y orden).
-- ============================================================================
create or replace view public.provider_badge_inputs as
 select p.id as provider_id,
    coalesce(p.is_verified, false) as documental_verified,
    r.avg_quality,
    r.avg_human_treatment,
    r.avg_professionalism,
    r.evs_score,
    coalesce(r.total_reviews, 0::bigint)::integer as total_reviews,
    greatest(
      coalesce((select max(o.discount_value) from offers o
        where o.provider_id = p.id and o.discount_type = 'percentage'::text
          and o.discount_value is not null and o.status = 'active'::text
          and (o.valid_from is null or o.valid_from <= now())
          and (o.valid_until is null or o.valid_until >= now())
          and coalesce(o.valid_from, o.created_at) <= (now() - '14 days'::interval)), 0::numeric),
      case when p.created_at <= (now() - '14 days'::interval)
           then coalesce((p.provider_details ->> 'discount_pct'::text)::numeric, 0::numeric)
           else 0::numeric end) as discount_pct,
    coalesce((select count(*) from content_posts cp
        where cp.author_id = p.id and cp.is_published = true), 0::bigint)::integer as content_count,
    -- Métricas internas: reales solo para el dueño o un admin; 0 para el resto.
    case when (select auth.uid()) = p.id or is_admin() then
      coalesce((select round(100.0 * count(*) filter (where a.status <> all (array['pending'::text,'requested'::text]))::numeric / nullif(count(*), 0)::numeric)
        from appointments a where a.provider_id = p.id), 0::numeric)
    else 0::numeric end as response_rate_pct,
    case when (select auth.uid()) = p.id or is_admin() then
      coalesce((select round(100.0 * count(*) filter (where t.c >= 2)::numeric / nullif(count(*), 0)::numeric)
        from (select appointments.patient_id, count(*) as c
                from appointments
               where appointments.provider_id = p.id
               group by appointments.patient_id) t), 0::numeric)
    else 0::numeric end as retention_pct
   from profiles p
     left join public_provider_ratings r on r.provider_id = p.id
  where p.role = 'provider'::text and p.is_published = true;
