-- ============================================================================
-- 0183 — Relevancia de fundador y donante como DESEMPATE, no como salto de peso
--
-- Antes: search_all sumaba +0.6 al score de un prestador fundador. Eso es tan
-- grande (la similitud va de 0 a 1) que un fundador apenas relacionado saltaba
-- por encima de un resultado mucho más pertinente. Ahora el orden se hace por
-- BANDA de relevancia (score redondeado a 0.1); DENTRO de una misma banda —es
-- decir, cuando la similitud base es parecida— desempatan primero el fundador y
-- luego el donante. Así la pertinencia manda y el privilegio solo reordena
-- empates.
--
-- Se añaden dos helpers espejo de los de fundador:
--   is_donor(uuid)          -> ¿tiene alguna donación pagada?
--   donor_provider_ids()    -> ids de prestadores publicados (no internos) donantes
--
-- Idempotente. search_all conserva su firma (create or replace basta).
-- ============================================================================

-- Donante = usuario con al menos una donación en estado 'paid'.
create or replace function public.is_donor(p_id uuid)
returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.donations d
    where d.donor_user_id = p_id and d.status = 'paid'
  );
$$;

-- Prestadores donantes visibles (mismo criterio que founder_provider_ids:
-- rol prestador, publicado y NO interno).
create or replace function public.donor_provider_ids()
returns table(id uuid)
language sql stable security definer
set search_path to 'public'
as $$
  select distinct d.donor_user_id
  from public.donations d
  join public.profiles p on p.id = d.donor_user_id
  where d.status = 'paid'
    and p.role = 'provider' and p.is_published
    and coalesce(p.is_internal, false) = false;
$$;

grant execute on function public.is_donor(uuid) to anon, authenticated;
grant execute on function public.donor_provider_ids() to anon, authenticated;

-- Buscador interno: relevancia por banda, fundador/donante solo como desempate.
create or replace function public.search_all(q text)
returns table(kind text, id uuid, title text, subtitle text, url text)
language sql
stable security definer
set search_path to 'public', 'extensions'
as $function$
  with term as (select lower(btrim(q)) as q, '%' || lower(btrim(q)) || '%' as p)
  select s.kind, s.id, s.title, s.subtitle, s.url
  from (
    select 'post'::text as kind, cp.id, cp.title,
           coalesce(array_to_string(cp.keywords, ', '), '') as subtitle,
           case when cp.type = 'link' then cp.external_url else '/contenido/' || cp.id::text end as url,
           greatest(similarity(lower(cp.title), t.q),
                    case when lower(cp.title) like t.p then 0.45 else 0 end) as score,
           false as founder, false as donor
    from public.content_posts cp, term t
    where cp.is_published
      and (lower(cp.title) like t.p or lower(cp.title) % t.q
           or exists (select 1 from unnest(cp.keywords) k where lower(k) like t.p or lower(k) % t.q))
    union all
    select 'provider'::text, p.id, coalesce(p.business_name, p.full_name),
           coalesce(p.services_offered, ''), '/proveedor/' || p.id::text,
           greatest(similarity(lower(coalesce(p.business_name, p.full_name)), t.q),
                    similarity(lower(coalesce(p.services_offered, '')), t.q),
                    case when lower(coalesce(p.business_name, p.full_name)) like t.p then 0.45 else 0 end) as score,
           public.is_founder(p.id) as founder, public.is_donor(p.id) as donor
    from public.profiles p, term t
    where p.role = 'provider' and p.is_published and public.is_member_active(p.id)
      and (lower(coalesce(p.business_name, p.full_name)) like t.p
           or lower(coalesce(p.services_offered, '')) like t.p
           or lower(coalesce(p.business_name, p.full_name)) % t.q
           or lower(coalesce(p.services_offered, '')) % t.q)
    union all
    select 'provider'::text, d.id, d.nombre,
           coalesce(d.especializacion, ''), '/proveedor/' || d.id::text,
           greatest(similarity(lower(d.nombre), t.q),
                    similarity(lower(coalesce(d.especializacion, '')), t.q),
                    case when lower(d.nombre) like t.p then 0.45 else 0 end) as score,
           false as founder, false as donor
    from public.directorio d, term t
    where d.estado_revision = 'publicado'
      and not d.baja_solicitada
      and d.reclamada_por is null
      and not exists (select 1 from public.profiles p
                       where p.id = d.id and p.is_published and p.role = 'provider')
      and (lower(d.nombre) like t.p or lower(d.nombre) % t.q
           or lower(coalesce(d.especializacion, '')) like t.p
           or lower(coalesce(d.especializacion, '')) % t.q)
    union all
    select 'product'::text, pr.id, pr.name, coalesce(pr.description, ''), '/proveedor/' || pr.vendor_id::text,
           greatest(similarity(lower(pr.name), t.q),
                    case when lower(pr.name) like t.p then 0.45 else 0 end) as score,
           false as founder, false as donor
    from public.products pr, term t
    where lower(pr.name) like t.p or lower(coalesce(pr.description, '')) like t.p or lower(pr.name) % t.q
  ) s
  -- Banda de relevancia (0.1): dentro de la misma banda —similitud parecida—
  -- desempatan primero fundador y luego donante; después la similitud fina.
  order by round(s.score::numeric, 1) desc,
           s.founder desc,
           s.donor desc,
           s.score desc,
           s.title asc
  limit 50;
$function$;
