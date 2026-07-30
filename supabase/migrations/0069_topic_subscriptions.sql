-- 0069_topic_subscriptions.sql
-- Notificaciones por categoría (opt-in): pacientes y padres/tutores eligen temas
-- (empleo, voluntariado, servicio social, esparcimiento) y reciben un aviso IN-APP
-- (y push, vía el trigger existente) cuando se publica algo nuevo de ese tema en
-- su país/ciudad. Mismo patrón que search_alerts (0054).

create table if not exists public.topic_subscriptions (
  user_id       uuid primary key references public.profiles (id) on delete cascade,
  topics        text[] not null default '{}',   -- employment, volunteering, social_service, esparcimiento
  scope_country text,                            -- null/'' = cualquier país
  scope_city    text,                            -- null/'' = cualquier ciudad
  updated_at    timestamptz not null default now()
);

alter table public.topic_subscriptions enable row level security;
drop policy if exists topicsub_own on public.topic_subscriptions;
create policy topicsub_own on public.topic_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- notif_category: clasifica los tipos nuevos como "comunidad".
create or replace function public.notif_category(p_type text)
returns text
language sql immutable set search_path = public as $$
  select case
    when p_type like 'appt_%' or p_type in ('booking_request', 'waitlist_slot') then 'citas'
    when p_type in ('direct_message', 'admin_message', 'account_costo') then 'mensajes'
    when p_type in ('post_achievement', 'badge', 'waitlist_join', 'referral_use', 'referral_reward', 'directory_match', 'suspension_reminder', 'topic_job', 'topic_venue') then 'comunidad'
    when p_type in ('commission_paid', 'donation_thanks') then 'transacciones'
    when p_type = 'campaign' then 'campanas'
    else 'otras'
  end;
$$;

-- ── Aviso: nueva oportunidad (empleo/voluntariado/servicio social) ──────────
create or replace function public.notify_topic_job()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if NEW.is_active is not true then return NEW; end if;
  -- En UPDATE, solo si ACABA de activarse (no re-avisar cada edición).
  if TG_OP = 'UPDATE' and coalesce(OLD.is_active, false) = true then return NEW; end if;

  insert into public.notifications (user_id, type, title, body, data)
  select
    ts.user_id, 'topic_job', 'Nueva oportunidad', coalesce(NEW.title, ''),
    jsonb_build_object(
      'job_id', NEW.id, 'opportunity_type', NEW.opportunity_type,
      'title', NEW.title, 'country', NEW.country, 'city', NEW.city
    )
  from public.topic_subscriptions ts
  where ts.user_id <> NEW.company_id
    and ts.topics @> array[NEW.opportunity_type]
    and (ts.scope_country is null or ts.scope_country = '' or ts.scope_country = NEW.country)
    and (ts.scope_city is null or ts.scope_city = '' or ts.scope_city = NEW.city);
  return NEW;
end; $$;

drop trigger if exists trg_notify_topic_job on public.job_openings;
create trigger trg_notify_topic_job
  after insert or update of is_active on public.job_openings
  for each row execute function public.notify_topic_job();

-- ── Aviso: nuevo lugar de esparcimiento (prestador 'tourism' publicado) ─────
create or replace function public.notify_topic_venue()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if NEW.provider_type is distinct from 'tourism' then return NEW; end if;
  if NEW.is_published is not true then return NEW; end if;
  if TG_OP = 'UPDATE' and coalesce(OLD.is_published, false) = true then return NEW; end if;

  insert into public.notifications (user_id, type, title, body, data)
  select
    ts.user_id, 'topic_venue', 'Nuevo lugar de esparcimiento',
    coalesce(NEW.business_name, NEW.full_name, ''),
    jsonb_build_object(
      'provider_id', NEW.id, 'name', coalesce(NEW.business_name, NEW.full_name),
      'country', NEW.country, 'city', NEW.city
    )
  from public.topic_subscriptions ts
  where ts.user_id <> NEW.id
    and ts.topics @> array['esparcimiento']
    and (ts.scope_country is null or ts.scope_country = '' or ts.scope_country = NEW.country)
    and (ts.scope_city is null or ts.scope_city = '' or ts.scope_city = NEW.city);
  return NEW;
end; $$;

drop trigger if exists trg_notify_topic_venue on public.profiles;
create trigger trg_notify_topic_venue
  after insert or update of is_published on public.profiles
  for each row execute function public.notify_topic_venue();
