-- ============================================================================
-- Distintivo: mejoras (descuento estructurado + antigüedad, respuesta y
-- retención desde appointments, e insumos para el panel admin)
-- ----------------------------------------------------------------------------
-- 1) discount_pct = mejor entre:
--      a) mejor oferta % ACTIVA y con al menos 14 días de antigüedad (anti-gaming), y
--      b) el % capturado en el registro (provider_details.discount_pct), válido
--         solo si la cuenta tiene ≥14 días (evita subir un % alto recién creado).
-- 2) response_rate_pct: % de citas atendidas (el proveedor actuó, no quedaron
--      en "pending") sobre el total.
-- 3) retention_pct: % de pacientes que regresan (2+ citas) sobre pacientes únicos.
-- Idempotente.
-- ============================================================================

-- Vista PÚBLICA (proveedores publicados) — insumos del distintivo.
create or replace view public.provider_badge_inputs
  with (security_invoker = off) as
select
  p.id                              as provider_id,
  coalesce(p.is_verified, false)    as documental_verified,
  r.avg_quality,
  r.avg_human_treatment,
  r.avg_professionalism,
  r.evs_score,
  coalesce(r.total_reviews, 0)::int as total_reviews,
  greatest(
    -- a) mejor oferta % activa con ≥14 días de antigüedad
    coalesce((
      select max(o.discount_value)
      from public.offers o
      where o.provider_id = p.id
        and o.discount_type = 'percentage'
        and o.discount_value is not null
        and o.status = 'active'
        and (o.valid_from  is null or o.valid_from  <= now())
        and (o.valid_until is null or o.valid_until >= now())
        and coalesce(o.valid_from, o.created_at) <= now() - interval '14 days'
    ), 0),
    -- b) % capturado en el registro (si la cuenta ya tiene ≥14 días)
    case
      when p.created_at <= now() - interval '14 days'
        then coalesce((p.provider_details ->> 'discount_pct')::numeric, 0)
      else 0
    end
  )::numeric                        as discount_pct,
  coalesce((
    select count(*) from public.content_posts cp
    where cp.author_id = p.id and cp.is_published = true
  ), 0)::int                        as content_count,
  coalesce((
    select round(100.0 * count(*) filter (where a.status not in ('pending', 'requested'))
                 / nullif(count(*), 0))
    from public.appointments a where a.provider_id = p.id
  ), 0)::numeric                    as response_rate_pct,
  coalesce((
    select round(100.0 * count(*) filter (where t.c >= 2) / nullif(count(*), 0))
    from (
      select patient_id, count(*) as c
      from public.appointments where provider_id = p.id
      group by patient_id
    ) t
  ), 0)::numeric                    as retention_pct
from public.profiles p
left join public.public_provider_ratings r on r.provider_id = p.id
where p.role = 'provider'
  and p.is_published = true;

grant select on public.provider_badge_inputs to anon, authenticated;

-- RPC admin: los MISMOS insumos para TODOS los proveedores (incluidos los no
-- publicados / en revisión), para poder mostrar el distintivo en moderación.
create or replace function public.admin_badge_inputs()
returns table (
  provider_id uuid,
  documental_verified boolean,
  avg_quality numeric,
  avg_human_treatment numeric,
  avg_professionalism numeric,
  evs_score numeric,
  total_reviews integer,
  discount_pct numeric,
  content_count integer,
  response_rate_pct numeric,
  retention_pct numeric
)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  return query
  select
    p.id,
    coalesce(p.is_verified, false),
    r.avg_quality, r.avg_human_treatment, r.avg_professionalism, r.evs_score,
    coalesce(r.total_reviews, 0)::int,
    greatest(
      coalesce((
        select max(o.discount_value) from public.offers o
        where o.provider_id = p.id and o.discount_type = 'percentage'
          and o.discount_value is not null and o.status = 'active'
          and (o.valid_from is null or o.valid_from <= now())
          and (o.valid_until is null or o.valid_until >= now())
          and coalesce(o.valid_from, o.created_at) <= now() - interval '14 days'
      ), 0),
      case when p.created_at <= now() - interval '14 days'
        then coalesce((p.provider_details ->> 'discount_pct')::numeric, 0) else 0 end
    )::numeric,
    coalesce((select count(*) from public.content_posts cp
      where cp.author_id = p.id and cp.is_published = true), 0)::int,
    coalesce((select round(100.0 * count(*) filter (where a.status not in ('pending','requested'))
      / nullif(count(*),0)) from public.appointments a where a.provider_id = p.id), 0)::numeric,
    coalesce((select round(100.0 * count(*) filter (where t.c >= 2) / nullif(count(*),0))
      from (select patient_id, count(*) c from public.appointments where provider_id = p.id group by patient_id) t), 0)::numeric
  from public.profiles p
  left join public.public_provider_ratings r on r.provider_id = p.id
  where p.role = 'provider';
end;
$$;

revoke all on function public.admin_badge_inputs() from public, anon;
grant execute on function public.admin_badge_inputs() to authenticated;
