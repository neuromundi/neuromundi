-- ============================================================================
-- 0045 — Donaciones (Etapa 1: captura y confirmación)
--
-- Guarda cada donación con TODO lo que pidió el brief: datos de contacto,
-- persona física vs empresa/organización, consentimiento para el muro de
-- donantes, decisión de envío de recompensas físicas y renuncia a ellas.
--
-- El cobro se hace por Stripe (pago ÚNICO) desde la Edge Function
-- create-donation-checkout, que escribe la fila en 'pending'; el webhook la pasa
-- a 'paid'. Puede donar cualquiera, con o sin cuenta: por eso donor_user_id es
-- opcional y los datos del donante se guardan aquí aunque no exista perfil.
--
-- Idempotente. Aplicar en el SQL Editor después de la 0044.
--
-- ETAPA 2 (otro entregable): muro público, carrusel de aliados y panel admin
-- con estadística y CRUD del muro. Aquí se dejan ya las columnas que ese muro
-- necesitará (wall_*), pero su UI y sus RPC de gestión van en la etapa 2.
-- ============================================================================

create table if not exists public.donations (
  id                 uuid primary key default gen_random_uuid(),

  -- Donante: puede ser un miembro (perfil) o un invitado sin cuenta.
  donor_user_id      uuid references public.profiles(id) on delete set null,

  -- Importe. Se guarda en la unidad mínima de la moneda (centavos), como el
  -- resto de pagos del sistema.
  amount_cents       integer not null check (amount_cents > 0),
  currency           text not null,
  -- Nivel alcanzado ('seed' | 'ally' | 'driver' | 'ambassador'). Lo calcula el
  -- servidor a partir del monto y la moneda, no se confía en el cliente.
  level              text not null check (level in ('seed','ally','driver','ambassador')),

  -- Identidad del donante.
  is_company         boolean not null default false,
  -- Persona física: su nombre. Empresa: nombre de la persona de contacto.
  contact_name       text not null,
  -- Solo si is_company: nombre de la empresa u organización.
  org_name           text,
  email              text not null,

  -- Muro de donantes: consentimiento para publicar el nombre, y con qué nombre
  -- se mostraría (por defecto el de la empresa o el de la persona).
  publish_consent    boolean not null default false,
  publish_as         text,

  -- Recompensas físicas (pin, taza) — aplican del nivel 'ally' en adelante.
  -- El donante puede RENUNCIAR a ellas para que el 100% vaya a la causa.
  waive_physical     boolean not null default false,
  -- Envío: un miembro puede reusar su dirección registrada o dar otra; un
  -- invitado siempre da la completa. Se guarda desnormalizado para no depender
  -- del perfil (que el miembro podría cambiar después).
  ship_use_registered boolean not null default false,
  ship_recipient     text,
  ship_address       text,
  ship_city          text,
  ship_postal        text,
  ship_country       text,

  -- Recompensas digitales otorgadas automáticamente al confirmarse el pago.
  -- El curso y la insignia solo pueden concederse a un miembro (donor_user_id);
  -- para invitados quedan en false y el admin gestiona su entrega.
  grant_course       boolean not null default false,
  grant_badge        boolean not null default false,

  -- Estado del cobro.
  status             text not null default 'pending'
                     check (status in ('pending','paid','failed','refunded')),
  stripe_session_id  text,
  paid_at            timestamptz,

  -- Muro (lo gestiona el admin en la etapa 2).
  wall_published     boolean not null default false,
  wall_featured      boolean not null default false,  -- mención destacada (embajador)
  wall_note          text,
  wall_logo_url      text,

  created_at         timestamptz not null default now()
);

create index if not exists idx_donations_status on public.donations (status, created_at desc);
create index if not exists idx_donations_user on public.donations (donor_user_id);
create index if not exists idx_donations_wall on public.donations (wall_published) where wall_published = true;

alter table public.donations enable row level security;

-- El donante que sea miembro puede ver SUS donaciones. La escritura es siempre
-- del servidor (service_role, en la Edge Function y el webhook), que salta RLS.
drop policy if exists donations_own_select on public.donations;
create policy donations_own_select on public.donations
  for select using (donor_user_id = auth.uid());

-- El admin ve todo.
drop policy if exists donations_admin_select on public.donations;
create policy donations_admin_select on public.donations
  for select using (public.is_admin());

-- ── Muro público (solo lo publicado y consentido) ───────────────────────────
-- Lectura anónima: cualquiera puede ver el muro. Se expone SOLO lo necesario
-- (nombre a mostrar, nivel, si es destacado, nota y logo), nunca correo, monto
-- exacto ni dirección. La UI del muro se construye en la etapa 2; la función ya
-- queda lista para no dejar el dato inaccesible.
drop function if exists public.donor_wall();
create or replace function public.donor_wall()
returns table (
  display_name text,
  level text,
  is_company boolean,
  featured boolean,
  note text,
  logo_url text,
  since timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    coalesce(nullif(d.publish_as, ''), d.org_name, d.contact_name),
    d.level,
    d.is_company,
    d.wall_featured,
    d.wall_note,
    d.wall_logo_url,
    d.paid_at
  from public.donations d
  where d.status = 'paid'
    and d.publish_consent = true
    and d.wall_published = true
  order by d.wall_featured desc, d.paid_at desc nulls last;
$$;
grant execute on function public.donor_wall() to anon, authenticated;
