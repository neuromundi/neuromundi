-- ============================================================================
-- 0052 — Plantillas de mensaje (respuestas rápidas)
--
-- El prestador repite mucho las mismas frases (confirmar cita, pedir datos,
-- enlaces de video). Estas plantillas viven en la base (no en el dispositivo)
-- para tenerlas en cualquier navegador, y son PRIVADAS de cada usuario.
--
-- Idempotente. Aplicar después de la 0051.
-- ============================================================================

create table if not exists public.message_templates (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  body        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_message_templates_owner
  on public.message_templates (owner_id, sort_order);

alter table public.message_templates enable row level security;

-- Cada quien gestiona SOLO sus plantillas.
drop policy if exists message_templates_own on public.message_templates;
create policy message_templates_own on public.message_templates
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
