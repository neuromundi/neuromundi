-- 0084_raffle_tickets.sql
-- Campaña (Fase 5): boletos de sorteo.
--   · Participación automática: 1 boleto al registrarse mientras la campaña está
--     activa (source 'signup').
--   · Referidos: 1 boleto al referente por CADA persona que se registra con su
--     enlace (source 'referral'). Vale para todos los perfiles (entradas extra por
--     invitar); el admin decide el sorteo según el rol (pacientes/familias/tutores
--     → terapias; miembros de pago → año de membresía).
-- El sorteo en sí (elegir ganadores) se hace el día del lanzamiento con la lista
-- que expone `admin_raffle_entries`. Idempotente.

create table if not exists public.raffle_tickets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  source     text not null default 'referral' check (source in ('signup', 'referral')),
  ref_id     uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists raffle_tickets_user_idx on public.raffle_tickets (user_id);
-- Un boleto de 'signup' por usuario como máximo.
create unique index if not exists raffle_tickets_signup_uniq on public.raffle_tickets (user_id) where source = 'signup';
-- Un boleto de 'referral' por par (referente, referido).
create unique index if not exists raffle_tickets_referral_uniq on public.raffle_tickets (user_id, ref_id) where source = 'referral';

alter table public.raffle_tickets enable row level security;
drop policy if exists raffle_own_read on public.raffle_tickets;
create policy raffle_own_read on public.raffle_tickets for select
  using (user_id = auth.uid() or public.is_admin());
-- Escritura solo por triggers (security definer); sin policy de insert.

-- Boleto automático al registrarse durante la campaña.
create or replace function public.grant_signup_raffle()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.campaign_config where id = 1 and active) then
    insert into public.raffle_tickets (user_id, source) values (NEW.id, 'signup')
    on conflict do nothing;
  end if;
  return NEW;
end; $$;
drop trigger if exists trg_raffle_signup on public.profiles;
create trigger trg_raffle_signup after insert on public.profiles
  for each row execute function public.grant_signup_raffle();

-- Boleto al referente por cada referido registrado.
create or replace function public.grant_referral_raffle()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.raffle_tickets (user_id, source, ref_id)
  values (NEW.referrer_id, 'referral', NEW.referred_id)
  on conflict do nothing;
  return NEW;
end; $$;
drop trigger if exists trg_raffle_referral on public.referrals;
create trigger trg_raffle_referral after insert on public.referrals
  for each row execute function public.grant_referral_raffle();

-- Boletos del usuario actual (para el panel de recomendación).
create or replace function public.my_raffle_tickets()
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.raffle_tickets where user_id = auth.uid();
$$;
grant execute on function public.my_raffle_tickets() to authenticated;

-- Lista para el sorteo (admin): participantes con su total de boletos.
create or replace function public.admin_raffle_entries()
returns table (user_id uuid, name text, member_no bigint, email text, role text, tickets bigint)
language sql stable security definer set search_path = public as $$
  select p.id,
         coalesce(nullif(p.business_name, ''), nullif(p.full_name, ''), '—'),
         p.member_no, u.email, p.role::text, count(rt.id)
  from public.raffle_tickets rt
  join public.profiles p on p.id = rt.user_id
  join auth.users u on u.id = rt.user_id
  where public.is_admin()
  group by p.id, p.business_name, p.full_name, p.member_no, u.email, p.role
  order by count(rt.id) desc;
$$;
grant execute on function public.admin_raffle_entries() to authenticated;
