-- ============================================================================
-- 0184 — Programa de créditos de alianza (retorno por afiliados de pago)
--
-- Una alianza (asociación/colegio/red) tiene un código propio (p. ej. FESPAU10).
-- Cuando un afiliado de PAGO se registra con ese código, se acumula un "crédito"
-- a favor de la alianza, que luego se liquida como RETORNO NO monetario
-- (subir de nivel de aliado + membresías de fundador para sus profesionales).
-- El aporte monetario a su causa queda como decisión aparte (implicaciones
-- fiscales/éticas), por eso aquí solo se registra el crédito, no se paga efectivo.
--
-- Enganche pendiente (fuera de esta migración): el webhook de Stripe debe llamar
-- a record_alliance_credit(user_id, profiles.promo_code_used, moneda, importe)
-- al confirmarse una membresía pagada, y marcar void en charge.refunded.
-- Idempotente.
-- ============================================================================

create table if not exists public.alliance_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  promo_code text unique,
  country text,
  tier text not null default 'aliado' check (tier in ('aliado','destacado','embajador')),
  contact text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.alliance_credits (
  id uuid primary key default gen_random_uuid(),
  alliance_id uuid not null references public.alliance_partners(id) on delete cascade,
  source_user_id uuid not null references public.profiles(id) on delete cascade,
  currency text,
  amount_value numeric,
  status text not null default 'accrued' check (status in ('accrued','redeemed','void')),
  created_at timestamptz not null default now(),
  unique (alliance_id, source_user_id)
);
create index if not exists idx_alliance_credits_alliance on public.alliance_credits(alliance_id);

alter table public.alliance_partners enable row level security;
alter table public.alliance_credits enable row level security;
drop policy if exists alliance_partners_admin on public.alliance_partners;
create policy alliance_partners_admin on public.alliance_partners for all
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists alliance_credits_admin on public.alliance_credits;
create policy alliance_credits_admin on public.alliance_credits for all
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.record_alliance_credit(p_user_id uuid, p_code text, p_currency text default null, p_amount numeric default null)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_alliance uuid;
begin
  if p_code is null then return; end if;
  select ap.id into v_alliance from public.alliance_partners ap
   where lower(ap.promo_code) = lower(p_code) and ap.is_active limit 1;
  if v_alliance is null then return; end if;
  insert into public.alliance_credits (alliance_id, source_user_id, currency, amount_value)
  values (v_alliance, p_user_id, p_currency, p_amount)
  on conflict (alliance_id, source_user_id) do nothing;
  update public.alliance_partners ap set tier =
    case when c.n >= 50 then 'embajador' when c.n >= 20 then 'destacado' else 'aliado' end
  from (select count(*) n from public.alliance_credits ac where ac.alliance_id = v_alliance and ac.status <> 'void') c
  where ap.id = v_alliance;
end; $$;
revoke all on function public.record_alliance_credit(uuid,text,text,numeric) from public, anon, authenticated;
grant execute on function public.record_alliance_credit(uuid,text,text,numeric) to service_role;

create or replace function public.admin_alliance_summary()
returns table(alliance_id uuid, name text, promo_code text, country text, tier text, affiliates integer, credits_accrued integer, credits_value numeric)
language sql stable security definer set search_path to 'public' as $$
  select ap.id, ap.name, ap.promo_code, ap.country, ap.tier,
    count(ac.id)::int,
    count(ac.id) filter (where ac.status='accrued')::int,
    coalesce(sum(ac.amount_value) filter (where ac.status <> 'void'),0)
  from public.alliance_partners ap
  left join public.alliance_credits ac on ac.alliance_id = ap.id
  where public.is_admin()
  group by ap.id, ap.name, ap.promo_code, ap.country, ap.tier
  order by 6 desc, ap.name;
$$;
grant execute on function public.admin_alliance_summary() to authenticated;

create or replace function public.admin_alliance_redeem(p_alliance_id uuid)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'no autorizado'; end if;
  update public.alliance_credits set status='redeemed'
   where alliance_id=p_alliance_id and status='accrued';
  get diagnostics n = row_count;
  return n;
end; $$;
grant execute on function public.admin_alliance_redeem(uuid) to authenticated;

create or replace function public.admin_set_alliance_partner(p_name text, p_promo_code text, p_country text default null)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'no autorizado'; end if;
  insert into public.alliance_partners (name, promo_code, country)
  values (p_name, upper(p_promo_code), p_country)
  on conflict (promo_code) do update set name=excluded.name, country=excluded.country
  returning id into v_id;
  return v_id;
end; $$;
grant execute on function public.admin_set_alliance_partner(text,text,text) to authenticated;

insert into public.alliance_partners (name, promo_code, country) values
 ('FESPAU','FESPAU10','España'),
 ('FEDMA','FEDMA10','México'),
 ('Red Mexicana de Asociaciones de Parkinson','PARKINSONMX10','México'),
 ('FEDACE','FEDACE10','España'),
 ('Sociedad Peruana de Síndrome Down','DOWNPERU10','Perú'),
 ('ASDRA','ASDRA10','Argentina'),
 ('Proyectodah / Cerebro Feliz','PROYECTODAH10','México'),
 ('Autismo España','AUTISMOESP10','España'),
 ('RIADIS','RIADIS10',null),
 ('FEDE','FEDE10','España')
on conflict (promo_code) do nothing;
