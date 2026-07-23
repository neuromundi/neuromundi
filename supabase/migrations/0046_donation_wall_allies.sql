-- ============================================================================
-- 0046 — Donaciones (Etapa 2): aliados, muro y gestión de admin
--
-- Añade lo que faltaba de la etapa 1:
--  · public.allies       — logos de instituciones/empresas aliadas (carrusel).
--  · admin_donation_stats — estadística por moneda para el panel.
--  · admin_donations      — lista completa para el panel (incluye datos de envío).
--  · admin_set_donation_wall — publicar / editar / quitar / destacar en el muro.
--
-- El muro PÚBLICO ya lo sirve donor_wall() (migración 0045). Aquí solo se agrega
-- lo que el admin necesita para curarlo.
--
-- Idempotente. Aplicar después de la 0045.
-- ============================================================================

-- ── 1. Aliados (carrusel del home) ──────────────────────────────────────────
create table if not exists public.allies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  logo_url    text not null,
  website     text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.allies enable row level security;

-- Lectura pública SOLO de los activos (el carrusel lo ve cualquiera).
drop policy if exists allies_public_read on public.allies;
create policy allies_public_read on public.allies
  for select using (is_active = true);

-- El admin ve y gestiona todo. Cuatro políticas porque una sola `for all` no
-- distingue lectura de escritura y queríamos que la lectura pública de arriba
-- conviva con la del admin (que además ve los inactivos).
drop policy if exists allies_admin_read on public.allies;
create policy allies_admin_read on public.allies
  for select using (public.is_admin());
drop policy if exists allies_admin_insert on public.allies;
create policy allies_admin_insert on public.allies
  for insert with check (public.is_admin());
drop policy if exists allies_admin_update on public.allies;
create policy allies_admin_update on public.allies
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists allies_admin_delete on public.allies;
create policy allies_admin_delete on public.allies
  for delete using (public.is_admin());

-- ── 2. Estadística de donaciones (admin) ────────────────────────────────────
-- Por moneda, porque sumar pesos con dólares no significa nada. SQL puro.
drop function if exists public.admin_donation_stats();
create or replace function public.admin_donation_stats()
returns table (
  currency text,
  paid_count integer,
  paid_cents bigint,
  wall_published integer,
  physical_pending integer
)
language sql stable security definer set search_path = public as $$
  select
    d.currency,
    count(*) filter (where d.status = 'paid')::int,
    coalesce(sum(d.amount_cents) filter (where d.status = 'paid'), 0)::bigint,
    count(*) filter (where d.status = 'paid' and d.wall_published)::int,
    -- Envíos físicos pendientes: pagados, con derecho a recompensa física
    -- (nivel Aliado en adelante) y sin renunciar a ella.
    count(*) filter (
      where d.status = 'paid'
        and d.waive_physical = false
        and d.level in ('ally','driver','ambassador')
    )::int
  from public.donations d
  where public.is_admin()
  group by d.currency
  order by d.currency;
$$;
grant execute on function public.admin_donation_stats() to authenticated;

-- ── 3. Lista de donaciones (admin) ──────────────────────────────────────────
drop function if exists public.admin_donations(text);
create or replace function public.admin_donations(p_status text default null)
returns table (
  id uuid,
  created_at timestamptz,
  paid_at timestamptz,
  status text,
  level text,
  amount_cents integer,
  currency text,
  is_company boolean,
  contact_name text,
  org_name text,
  email text,
  publish_consent boolean,
  publish_as text,
  wall_published boolean,
  wall_featured boolean,
  wall_note text,
  wall_logo_url text,
  waive_physical boolean,
  ship_use_registered boolean,
  ship_recipient text,
  ship_address text,
  ship_city text,
  ship_postal text,
  ship_country text
)
language sql stable security definer set search_path = public as $$
  select
    d.id, d.created_at, d.paid_at, d.status, d.level, d.amount_cents, d.currency,
    d.is_company, d.contact_name, d.org_name, d.email,
    d.publish_consent, d.publish_as, d.wall_published, d.wall_featured, d.wall_note, d.wall_logo_url,
    d.waive_physical, d.ship_use_registered, d.ship_recipient,
    d.ship_address, d.ship_city, d.ship_postal, d.ship_country
  from public.donations d
  where public.is_admin()
    and (p_status is null or d.status = p_status)
  order by d.created_at desc;
$$;
grant execute on function public.admin_donations(text) to authenticated;

-- ── 4. Curar el muro (admin) ────────────────────────────────────────────────
-- Publicar, editar el nombre mostrado / nota / logo, destacar o quitar del muro.
-- Solo tiene sentido si el donante dio consentimiento; si no, se rechaza para no
-- publicar a alguien que no quiso.
drop function if exists public.admin_set_donation_wall(uuid, boolean, boolean, text, text, text);
create or replace function public.admin_set_donation_wall(
  p_id uuid,
  p_published boolean,
  p_featured boolean default false,
  p_publish_as text default null,
  p_note text default null,
  p_logo_url text default null
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_consent boolean;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select publish_consent into v_consent from public.donations where id = p_id;
  if v_consent is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if p_published and not v_consent then
    return jsonb_build_object('ok', false, 'error', 'no_consent');
  end if;

  update public.donations
     set wall_published = p_published,
         wall_featured  = p_featured,
         publish_as     = coalesce(nullif(trim(coalesce(p_publish_as, '')), ''), publish_as),
         wall_note      = nullif(trim(coalesce(p_note, '')), ''),
         wall_logo_url  = nullif(trim(coalesce(p_logo_url, '')), '')
   where id = p_id;

  return jsonb_build_object('ok', true);
end;
$$;
grant execute on function public.admin_set_donation_wall(uuid, boolean, boolean, text, text, text) to authenticated;
