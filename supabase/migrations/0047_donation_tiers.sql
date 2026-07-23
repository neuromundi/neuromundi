-- ============================================================================
-- 0047 — Importes de donación editables por el administrador
--
-- Hasta ahora los cuatro escalones (Semilla/Aliado/Impulsor/Embajador) estaban
-- fijos en el código (src/lib/donation.ts y la Edge Function). Se llevan a la
-- base para que el admin los ajuste por moneda desde el panel.
--
-- Un renglón por moneda con los CUATRO importes. El importe de cada nivel es a
-- la vez el botón preestablecido y el mínimo del nivel: donar >= ally_amount da
-- el nivel Aliado, etc. La restricción CHECK exige que vayan en orden creciente
-- para que la escalera tenga sentido.
--
-- Idempotente. Aplicar después de la 0046.
-- ============================================================================

create table if not exists public.donation_tiers (
  currency          text primary key,          -- 'USD', 'MXN', 'EUR'
  symbol            text not null default '$',
  zero_decimal      boolean not null default false,
  seed_amount       numeric not null,
  ally_amount       numeric not null,
  driver_amount     numeric not null,
  ambassador_amount numeric not null,
  is_active         boolean not null default true,
  updated_at        timestamptz not null default now(),
  constraint donation_tiers_order check (
    seed_amount > 0
    and ally_amount > seed_amount
    and driver_amount > ally_amount
    and ambassador_amount > driver_amount
  )
);

-- Siembra con los valores actuales del código (no pisa lo que el admin ya tenga).
insert into public.donation_tiers (currency, symbol, zero_decimal, seed_amount, ally_amount, driver_amount, ambassador_amount) values
  ('USD', '$', false, 10,  50,   100,  150),
  ('MXN', '$', false, 200, 1000, 2000, 3000),
  ('EUR', '€', false, 10,  50,   100,  150)
on conflict (currency) do nothing;

alter table public.donation_tiers enable row level security;

-- Lectura pública de las monedas activas (la página de donación las necesita
-- sin sesión). El admin ve también las inactivas.
drop policy if exists donation_tiers_read on public.donation_tiers;
create policy donation_tiers_read on public.donation_tiers
  for select using (is_active = true or public.is_admin());

-- Solo el admin escribe. La validación de orden la impone el CHECK de arriba.
drop policy if exists donation_tiers_admin_insert on public.donation_tiers;
create policy donation_tiers_admin_insert on public.donation_tiers
  for insert with check (public.is_admin());
drop policy if exists donation_tiers_admin_update on public.donation_tiers;
create policy donation_tiers_admin_update on public.donation_tiers
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists donation_tiers_admin_delete on public.donation_tiers;
create policy donation_tiers_admin_delete on public.donation_tiers
  for delete using (public.is_admin());
