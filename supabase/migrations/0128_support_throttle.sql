-- 0128_support_throttle.sql
-- Control de tasa para la Edge Function send-support (endpoint público de correo).
-- Evita que un atacante bombardee admin@neuromundi.com y queme la cuota de Resend.
-- La tabla solo la escribe/lee la función con service_role (que ignora RLS); NO se
-- otorgan permisos a anon/authenticated (queda inaccesible por la Data API).

create table if not exists public.support_throttle (
  id bigint generated always as identity primary key,
  ip text not null,
  created_at timestamptz not null default now()
);

alter table public.support_throttle enable row level security;

create index if not exists idx_support_throttle_ip_time
  on public.support_throttle (ip, created_at desc);

-- Sin grants a anon/authenticated (regla del 30-oct): tabla puramente interna.
grant select, insert, delete on public.support_throttle to service_role;
