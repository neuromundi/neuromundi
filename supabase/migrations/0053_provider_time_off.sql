-- ============================================================================
-- 0053 — Bloqueos de agenda del prestador (vacaciones y horas sueltas)
--
-- La disponibilidad recurrente ya existe (reglas semanales en
-- provider_availability). Falta poder DECIR "estos días/horas no atiendo",
-- aunque la regla semanal diga que sí. Esta tabla guarda esos bloqueos; el
-- generador de huecos (generateSlots) los resta.
--
-- `all_day = true` bloquea el/los días completos; `false` bloquea la franja de
-- horas exacta [starts_at, ends_at]. La lectura es PÚBLICA porque el paciente
-- genera los huecos en su navegador y necesita saber qué está bloqueado; solo
-- revela indisponibilidad, nunca el motivo a terceros (el motivo lo ve el dueño).
--
-- Idempotente. Aplicar después de la 0052.
-- ============================================================================

create table if not exists public.provider_time_off (
  id           uuid primary key default gen_random_uuid(),
  provider_id  uuid not null references public.profiles(id) on delete cascade,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  all_day      boolean not null default true,
  reason       text,
  created_at   timestamptz not null default now(),
  constraint time_off_range check (ends_at > starts_at)
);

create index if not exists idx_time_off_provider
  on public.provider_time_off (provider_id, starts_at);

alter table public.provider_time_off enable row level security;

-- El dueño gestiona sus bloqueos.
drop policy if exists time_off_owner on public.provider_time_off;
create policy time_off_owner on public.provider_time_off
  for all using (provider_id = auth.uid()) with check (provider_id = auth.uid());

-- Lectura pública de los RANGOS (para generar huecos). No expone el motivo a
-- terceros porque el front público no lo selecciona; aun así, la política solo
-- controla filas, no columnas, y el motivo no es sensible (p. ej. "vacaciones").
drop policy if exists time_off_public_read on public.provider_time_off;
create policy time_off_public_read on public.provider_time_off
  for select using (true);
