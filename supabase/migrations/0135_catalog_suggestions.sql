-- ============================================================================
-- 0135 — Sugerencias de catálogo (curaduría comunitaria)
--
-- Familias/pacientes (y cualquiera, con o sin cuenta) pueden proponer:
--   - una NUEVA CATEGORÍA del directorio      (kind = 'directory_category')
--   - un PRODUCTO que les gustaría encontrar  (kind = 'store_product')
--   - una CATEGORÍA de la tienda              (kind = 'store_category')
--
-- Son SUGERENCIAS: entran a una cola que el admin revisa y PROMUEVE a la
-- taxonomía real (o descarta). Nunca se crea la categoría/producto de forma
-- automática (la taxonomía es curada a propósito).
--
-- Mismo patrón de seguridad que 0057: se captura por función SECURITY DEFINER
-- para no confiar el user_id al cliente (se toma de auth.uid(), null si anónimo).
--
-- Idempotente.
-- ============================================================================

create table if not exists public.catalog_suggestions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete set null,
  email      text,
  kind       text not null check (kind in ('directory_category','store_product','store_category')),
  section    text,                 -- neurodesarrollo | neurodivergencias | afecciones | null
  name       text not null check (char_length(btrim(name)) > 0),
  note       text,
  country    text,
  page       text,                 -- ruta desde donde se envió (contexto)
  status     text not null default 'new' check (status in ('new','reviewed','accepted','dismissed')),
  created_at timestamptz not null default now()
);
create index if not exists idx_catalog_sugg_created on public.catalog_suggestions (created_at desc);
create index if not exists idx_catalog_sugg_status  on public.catalog_suggestions (status);

-- Anti-duplicados: una misma propuesta ABIERTA (kind + nombre normalizado) no se
-- repite. Al descartarse ('dismissed') deja de bloquear, por si se re-propone.
create unique index if not exists uq_catalog_sugg_open
  on public.catalog_suggestions (kind, lower(btrim(name)))
  where status <> 'dismissed';

alter table public.catalog_suggestions enable row level security;
-- Nadie lee/escribe directo: se envía por RPC y el admin lee/gestiona por RPC.

-- ── Enviar sugerencia (anónimo o con sesión) ────────────────────────────────
create or replace function public.submit_catalog_suggestion(
  p_kind    text,
  p_name    text,
  p_note    text default null,
  p_section text default null,
  p_country text default null,
  p_email   text default null,
  p_page    text default null
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_kind not in ('directory_category','store_product','store_category') then
    raise exception 'Tipo de sugerencia inválido';
  end if;
  if btrim(coalesce(p_name, '')) = '' then
    raise exception 'El nombre no puede estar vacío';
  end if;
  insert into public.catalog_suggestions (user_id, email, kind, section, name, note, country, page)
  values (
    auth.uid(),
    nullif(btrim(coalesce(p_email, '')), ''),
    p_kind,
    nullif(btrim(coalesce(p_section, '')), ''),
    left(btrim(p_name), 160),
    nullif(left(btrim(coalesce(p_note, '')), 1000), ''),
    nullif(btrim(coalesce(p_country, '')), ''),
    nullif(btrim(coalesce(p_page, '')), '')
  )
  -- Si ya existe una sugerencia ABIERTA idéntica, no duplicar (silencioso: para
  -- el usuario su intención quedó registrada).
  on conflict (kind, lower(btrim(name))) where (status <> 'dismissed') do nothing;
end;
$$;
grant execute on function public.submit_catalog_suggestion(text, text, text, text, text, text, text) to anon, authenticated;

-- ── Lectura para el admin ───────────────────────────────────────────────────
drop function if exists public.admin_catalog_suggestions();
create or replace function public.admin_catalog_suggestions()
returns table (
  id uuid, user_id uuid, email text, kind text, section text,
  name text, note text, country text, page text, status text, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select s.id, s.user_id, s.email, s.kind, s.section, s.name, s.note,
         s.country, s.page, s.status, s.created_at
    from public.catalog_suggestions s
   where public.is_admin()
   order by (s.status = 'new') desc, s.created_at desc;
$$;
grant execute on function public.admin_catalog_suggestions() to authenticated;

-- ── Cambiar estado (revisado/aceptado/descartado) ───────────────────────────
create or replace function public.admin_set_catalog_suggestion_status(
  p_id uuid, p_status text
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Solo el administrador';
  end if;
  if p_status not in ('new','reviewed','accepted','dismissed') then
    raise exception 'Estado inválido';
  end if;
  update public.catalog_suggestions set status = p_status where id = p_id;
end;
$$;
grant execute on function public.admin_set_catalog_suggestion_status(uuid, text) to authenticated;
