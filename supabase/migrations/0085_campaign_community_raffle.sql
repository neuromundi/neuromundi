-- 0085_campaign_community_raffle.sql
-- Campaña (Fase 6):
--   · Grupo privado: `campaign_config.community_url` (link de Discord/WhatsApp que
--     el admin pega; el front muestra el CTA solo si está puesto).
--   · Sorteo: `admin_raffle_draw` elige N ganadores al azar PONDERADO por número de
--     boletos (clave de muestreo `power(random(), 1/tickets)`), con filtro opcional
--     por rol (consumidores → terapias; pago → año de membresía), los guarda en
--     `raffle_winners` y los devuelve. `admin_raffle_winners` lista lo sorteado.
-- Idempotente. Aplicar tras 0084.

-- ── Grupo privado ────────────────────────────────────────────────────────────
alter table public.campaign_config add column if not exists community_url text;

create or replace function public.admin_set_campaign_community(p_url text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'solo administradores'; end if;
  update public.campaign_config set community_url = nullif(trim(p_url), ''), updated_at = now() where id = 1;
end; $$;
grant execute on function public.admin_set_campaign_community(text) to authenticated;

-- ── Sorteo: ganadores ────────────────────────────────────────────────────────
create table if not exists public.raffle_winners (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  batch       text,          -- etiqueta libre del sorteo (ej. "terapias", "membresia")
  role_filter text,          -- 'consumer' | 'paying' | null (todos)
  drawn_at    timestamptz not null default now()
);
alter table public.raffle_winners enable row level security;
drop policy if exists raffle_winners_admin on public.raffle_winners;
create policy raffle_winners_admin on public.raffle_winners for select using (public.is_admin());

-- Realiza el sorteo: elige p_count ganadores ponderados por boletos.
create or replace function public.admin_raffle_draw(p_count integer, p_role text default null, p_batch text default null)
returns table (user_id uuid, name text, member_no bigint, email text, tickets bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'solo administradores'; end if;
  if coalesce(p_count, 0) <= 0 then raise exception 'cantidad inválida'; end if;

  return query
  with winners as (
    insert into public.raffle_winners (user_id, batch, role_filter)
    select u.uid, p_batch, p_role
    from (
      select rt.user_id as uid, count(*) as tk
      from public.raffle_tickets rt
      join public.profiles p on p.id = rt.user_id
      where (
        p_role is null
        or (p_role = 'consumer' and p.role in ('parent', 'patient'))
        or (p_role = 'paying' and p.role = 'provider')
      )
      -- no repetir a quien ya ganó este mismo lote
      and not exists (select 1 from public.raffle_winners w where w.user_id = rt.user_id and w.batch is not distinct from p_batch)
      group by rt.user_id
    ) u
    order by power(random(), 1.0 / u.tk) desc
    limit p_count
    returning raffle_winners.user_id
  )
  select w.user_id,
         coalesce(nullif(p.business_name, ''), nullif(p.full_name, ''), '—'),
         p.member_no, us.email,
         (select count(*) from public.raffle_tickets rt where rt.user_id = w.user_id)
  from winners w
  join public.profiles p on p.id = w.user_id
  join auth.users us on us.id = w.user_id;
end; $$;
grant execute on function public.admin_raffle_draw(integer, text, text) to authenticated;

-- Ganadores ya sorteados (para revisar/exportar).
create or replace function public.admin_raffle_winners()
returns table (user_id uuid, name text, member_no bigint, email text, batch text, drawn_at timestamptz)
language sql stable security definer set search_path = public as $$
  select w.user_id,
         coalesce(nullif(p.business_name, ''), nullif(p.full_name, ''), '—'),
         p.member_no, u.email, w.batch, w.drawn_at
  from public.raffle_winners w
  join public.profiles p on p.id = w.user_id
  join auth.users u on u.id = w.user_id
  where public.is_admin()
  order by w.drawn_at desc;
$$;
grant execute on function public.admin_raffle_winners() to authenticated;
