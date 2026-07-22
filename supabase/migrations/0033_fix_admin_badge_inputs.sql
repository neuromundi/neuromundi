-- ============================================================================
-- Arregla admin_badge_inputs: "column reference provider_id is ambiguous"
-- ----------------------------------------------------------------------------
-- La función declara `returns table (provider_id uuid, ...)`, y en PL/pgSQL esas
-- columnas de salida son VARIABLES dentro del cuerpo. La subconsulta de
-- retención usaba `provider_id` sin calificar, así que Postgres no podía decidir
-- entre la variable y la columna de appointments (SQLSTATE 42702) y la RPC
-- devolvía 400. Se califica con alias (a2) y, por si acaso, se añade la
-- directiva #variable_conflict use_column. Idempotente.
-- ============================================================================

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
#variable_conflict use_column
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
    -- ARREGLO: alias a2 + columnas calificadas (antes: `where provider_id = p.id`).
    coalesce((select round(100.0 * count(*) filter (where t.c >= 2) / nullif(count(*),0))
      from (
        select a2.patient_id, count(*) c
        from public.appointments a2
        where a2.provider_id = p.id
        group by a2.patient_id
      ) t), 0)::numeric
  from public.profiles p
  left join public.public_provider_ratings r on r.provider_id = p.id
  where p.role = 'provider';
end;
$$;

revoke all on function public.admin_badge_inputs() from public, anon;
grant execute on function public.admin_badge_inputs() to authenticated;
