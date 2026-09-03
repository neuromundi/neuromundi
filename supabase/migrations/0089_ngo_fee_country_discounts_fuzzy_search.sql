-- 0089_ngo_fee_country_discounts_fuzzy_search.sql
-- Paquete: (A) cuota específica para ONG, (B) política de descuentos por país
-- controlable por el admin, (C) búsqueda interna DIFUSA (pg_trgm) con boost de
-- fundadores, (D) canal de WhatsApp configurable. Idempotente.

-- ══════════════════════════════════════════════════════════════════════════
-- A) CUOTA PARA ONG  ────────────────────────────────────────────────────────
-- Nueva clase de afiliado 'ngo'. Se amplía el CHECK de membership_fees, se
-- siembra una base editable y `affiliate_type_for` devuelve 'ngo' para las ONG.
alter table public.membership_fees drop constraint if exists membership_fees_affiliate_type_check;
alter table public.membership_fees
  add constraint membership_fees_affiliate_type_check
  check (affiliate_type in (
    'patient', 'parent',
    'medical_specialist', 'nonmedical_specialist',
    'service_provider', 'merchant', 'school', 'clinic', 'ngo'
  ));

insert into public.membership_fees (affiliate_type, base_usd)
values ('ngo', 30.00)
on conflict (affiliate_type) do nothing;

-- affiliate_type_for: las ONG (provider_type='ngo') tienen su propia cuota.
create or replace function public.affiliate_type_for(p_user uuid)
returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_role text; v_ptype text; v_prof text; v_override boolean; v_medical boolean;
begin
  select p.role, p.provider_type, p.profession, p.is_medical_override
    into v_role, v_ptype, v_prof, v_override
  from public.profiles p where p.id = p_user;

  if v_role is distinct from 'provider' then
    return coalesce(v_role, 'parent');
  end if;

  if v_ptype = 'ngo' then
    return 'ngo';
  end if;

  if v_ptype in ('merchant', 'school', 'clinic') then
    return v_ptype;
  end if;

  v_medical := coalesce(v_override, public.is_medical_profession(v_prof));
  if v_medical is true then
    return 'medical_specialist';
  end if;
  return 'nonmedical_specialist';
end; $$;
grant execute on function public.affiliate_type_for(uuid) to authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════════
-- B) POLÍTICA DE DESCUENTOS POR PAÍS  ────────────────────────────────────────
-- El admin define un % de descuento por país (sobre el primer pago de cuota),
-- que el checkout compone con recomendación/promo/fundador (tope 90%).
create table if not exists public.country_discounts (
  country_label text primary key,          -- país normalizado (como membership_prices)
  pct           int  not null check (pct between 0 and 100),
  is_active     boolean not null default true,
  note          text,
  updated_at    timestamptz not null default now()
);
alter table public.country_discounts enable row level security;
-- Lectura pública del % activo la da la RPC SECURITY DEFINER; sin políticas de RLS
-- directas (solo el admin escribe vía RPC).

-- % de descuento activo para un país (0 si no hay). Normaliza el nombre.
create or replace function public.country_discount_pct(p_country text)
returns int
language sql stable security definer set search_path = public as $$
  select coalesce((
    select cd.pct from public.country_discounts cd
    where cd.is_active = true
      and cd.country_label = public.normalize_country(coalesce(p_country, ''))
    limit 1
  ), 0);
$$;
grant execute on function public.country_discount_pct(text) to authenticated, service_role, anon;

-- Admin: listar todas las políticas.
create or replace function public.admin_country_discounts()
returns table (country_label text, pct int, is_active boolean, note text, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select cd.country_label, cd.pct, cd.is_active, cd.note, cd.updated_at
  from public.country_discounts cd
  where public.is_admin()
  order by cd.country_label;
$$;
grant execute on function public.admin_country_discounts() to authenticated;

-- Admin: fijar/actualizar (pct=null o país vacío elimina la fila).
create or replace function public.admin_set_country_discount(p_country text, p_pct int, p_active boolean default true, p_note text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare v_label text := public.normalize_country(coalesce(p_country, ''));
begin
  if not public.is_admin() then raise exception 'no autorizado'; end if;
  if coalesce(v_label, '') = '' then raise exception 'país inválido'; end if;
  if p_pct is null then
    delete from public.country_discounts where country_label = v_label;
    return;
  end if;
  if p_pct < 0 or p_pct > 100 then raise exception 'porcentaje fuera de rango'; end if;
  insert into public.country_discounts (country_label, pct, is_active, note, updated_at)
  values (v_label, p_pct, coalesce(p_active, true), nullif(btrim(coalesce(p_note,'')),''), now())
  on conflict (country_label) do update
    set pct = excluded.pct, is_active = excluded.is_active, note = excluded.note, updated_at = now();
end; $$;
grant execute on function public.admin_set_country_discount(text, int, boolean, text) to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- C) BÚSQUEDA INTERNA DIFUSA + BOOST DE FUNDADORES  ──────────────────────────
-- Recrea search_all: además de coincidencia por substring (LIKE), usa el
-- operador de similitud de pg_trgm (`%`) para tolerar erratas, y ordena por un
-- puntaje que SUMA un bonus a los prestadores fundadores (aparecen primero).
create extension if not exists pg_trgm;
create index if not exists idx_profiles_name_trgm on public.profiles using gin (lower(coalesce(business_name, full_name)) extensions.gin_trgm_ops);
create index if not exists idx_profiles_services_trgm on public.profiles using gin (lower(coalesce(services_offered, '')) extensions.gin_trgm_ops);

-- Nota: pg_trgm vive en el esquema `extensions` (Supabase). El search_path de
-- esta función DEBE incluirlo para resolver similarity() y el operador `%`.
create or replace function public.search_all(q text)
returns table (kind text, id uuid, title text, subtitle text, url text)
language sql stable security definer set search_path = public, extensions as $$
  with term as (select lower(btrim(q)) as q, '%' || lower(btrim(q)) || '%' as p)
  select s.kind, s.id, s.title, s.subtitle, s.url
  from (
    -- Publicaciones
    select 'post'::text as kind, cp.id, cp.title,
           coalesce(array_to_string(cp.keywords, ', '), '') as subtitle,
           case when cp.type = 'link' then cp.external_url else '/contenido/' || cp.id::text end as url,
           greatest(similarity(lower(cp.title), t.q),
                    case when lower(cp.title) like t.p then 0.45 else 0 end) as score
    from public.content_posts cp, term t
    where cp.is_published
      and (lower(cp.title) like t.p or lower(cp.title) % t.q
           or exists (select 1 from unnest(cp.keywords) k where lower(k) like t.p or lower(k) % t.q))
    union all
    -- Prestadores (con boost de fundador: +0.6 al puntaje).
    select 'provider'::text, p.id, coalesce(p.business_name, p.full_name),
           coalesce(p.services_offered, ''), '/proveedor/' || p.id::text,
           greatest(similarity(lower(coalesce(p.business_name, p.full_name)), t.q),
                    similarity(lower(coalesce(p.services_offered, '')), t.q),
                    case when lower(coalesce(p.business_name, p.full_name)) like t.p then 0.45 else 0 end)
             + case when public.is_founder(p.id) then 0.6 else 0 end as score
    from public.profiles p, term t
    where p.role = 'provider' and p.is_published and public.is_member_active(p.id)
      and (lower(coalesce(p.business_name, p.full_name)) like t.p
           or lower(coalesce(p.services_offered, '')) like t.p
           or lower(coalesce(p.business_name, p.full_name)) % t.q
           or lower(coalesce(p.services_offered, '')) % t.q)
    union all
    -- Productos
    select 'product'::text, pr.id, pr.name, coalesce(pr.description, ''), '/proveedor/' || pr.vendor_id::text,
           greatest(similarity(lower(pr.name), t.q),
                    case when lower(pr.name) like t.p then 0.45 else 0 end)
    from public.products pr, term t
    where lower(pr.name) like t.p or lower(coalesce(pr.description, '')) like t.p or lower(pr.name) % t.q
  ) s
  order by s.score desc, s.title asc
  limit 50;
$$;
grant execute on function public.search_all(text) to authenticated, anon;

-- ══════════════════════════════════════════════════════════════════════════
-- D) CANAL DE WHATSAPP  ──────────────────────────────────────────────────────
-- URL del canal de WhatsApp, editable por el admin; el pie muestra un botón para unirse.
alter table public.campaign_config add column if not exists whatsapp_url text;

create or replace function public.admin_set_whatsapp_url(p_url text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'no autorizado'; end if;
  update public.campaign_config set whatsapp_url = nullif(btrim(coalesce(p_url,'')),'') where id = 1;
end; $$;
grant execute on function public.admin_set_whatsapp_url(text) to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- E) SEO DE FUNDADORES  ──────────────────────────────────────────────────────
-- Lista pública de ids de PRESTADORES fundadores (publicados), para que el
-- directorio y el buscador los coloquen primero y les pongan el sello.
create or replace function public.founder_provider_ids()
returns table (id uuid)
language sql stable security definer set search_path = public as $$
  select fm.user_id
  from public.founder_members fm
  join public.profiles p on p.id = fm.user_id
  where p.role = 'provider' and p.is_published;
$$;
grant execute on function public.founder_provider_ids() to anon, authenticated;
