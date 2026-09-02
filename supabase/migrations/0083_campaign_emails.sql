-- 0083_campaign_emails.sql
-- Campaña (Fase 4): secuencia de correos con Resend (Edge Function campaign-emails).
--   · Bienvenida: a quien se registra mientras la campaña está activa (una vez).
--   · Recordatorio: cada 5 días a los perfiles de PAGO que no han cubierto la
--     cuota, con el % de descuento vigente según la etapa, hasta la apertura de su
--     país. Remitente admin@neuromundi.com (verificado en Resend).
-- Aquí van la cola (tabla + trigger de alta) y las RPCs que consume la función +
-- el cron que la invoca. El envío real lo hace la Edge Function. Idempotente.

create table if not exists public.campaign_emails (
  user_id          uuid primary key references public.profiles(id) on delete cascade,
  welcome_sent_at  timestamptz,
  last_reminder_at timestamptz,
  reminders_sent   integer not null default 0,
  created_at       timestamptz not null default now()
);
alter table public.campaign_emails enable row level security;
-- Sin policies para usuarios: solo se accede por RPC (security definer) / servicio.

-- Alta automática al registrarse, SOLO si la campaña está activa.
create or replace function public.enroll_campaign_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.campaign_config where id = 1 and active) then
    insert into public.campaign_emails (user_id) values (NEW.id) on conflict do nothing;
  end if;
  return NEW;
end; $$;
drop trigger if exists trg_enroll_campaign_email on public.profiles;
create trigger trg_enroll_campaign_email after insert on public.profiles
  for each row execute function public.enroll_campaign_email();

-- Cola de BIENVENIDA: quienes aún no la recibieron (con su fecha de apertura).
create or replace function public.campaign_welcome_queue()
returns table (user_id uuid, email text, name text, role text, provider_type text, country text, opens_at timestamptz)
language sql stable security definer set search_path = public as $$
  select ce.user_id, u.email,
         coalesce(nullif(p.business_name, ''), nullif(p.full_name, ''), 'Miembro'),
         p.role::text, p.provider_type::text, p.country,
         (select c.start_at + (coalesce((c.block_days_by_country->>p.country)::int, c.default_block_days) || ' days')::interval
          from public.campaign_config c where c.id = 1)
  from public.campaign_emails ce
  join public.profiles p on p.id = ce.user_id
  join auth.users u on u.id = ce.user_id
  where ce.welcome_sent_at is null and u.email is not null
  limit 200;
$$;
revoke all on function public.campaign_welcome_queue() from public, anon, authenticated;
grant execute on function public.campaign_welcome_queue() to service_role;

-- Cola de RECORDATORIO: perfiles de pago sin cuota cubierta, cada 5 días, antes de
-- la apertura de su país, con el % vigente según la etapa del descuento.
create or replace function public.campaign_reminder_queue()
returns table (user_id uuid, email text, name text, country text, pct integer, opens_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare c public.campaign_config%rowtype; v_pct integer;
begin
  select * into c from public.campaign_config where id = 1;
  if not found or not c.active then return; end if;

  select coalesce((
    select (s->>'pct')::int
    from jsonb_array_elements(c.founder_discount) s
    where (extract(epoch from (now() - c.start_at)) / 86400.0) <= (s->>'days')::int
    order by (s->>'days')::int asc
    limit 1
  ), 0) into v_pct;

  return query
  select ce.user_id, u.email,
         coalesce(nullif(p.business_name, ''), nullif(p.full_name, ''), 'Miembro'),
         p.country, v_pct,
         c.start_at + (coalesce((c.block_days_by_country->>p.country)::int, c.default_block_days) || ' days')::interval
  from public.campaign_emails ce
  join public.profiles p on p.id = ce.user_id
  join auth.users u on u.id = ce.user_id
  where u.email is not null
    and p.role = 'provider'
    and coalesce(p.provider_type::text, '') <> 'company'
    and coalesce(p.membership_status, '') in ('pending', 'past_due')
    and (ce.last_reminder_at is null or ce.last_reminder_at < now() - interval '5 days')
    and now() < c.start_at + (coalesce((c.block_days_by_country->>p.country)::int, c.default_block_days) || ' days')::interval
  limit 200;
end; $$;
revoke all on function public.campaign_reminder_queue() from public, anon, authenticated;
grant execute on function public.campaign_reminder_queue() to service_role;

-- Marca un envío (welcome / reminder).
create or replace function public.campaign_email_sent(p_user uuid, p_kind text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_kind = 'welcome' then
    update public.campaign_emails set welcome_sent_at = now() where user_id = p_user;
  elsif p_kind = 'reminder' then
    update public.campaign_emails set last_reminder_at = now(), reminders_sent = reminders_sent + 1 where user_id = p_user;
  end if;
end; $$;
revoke all on function public.campaign_email_sent(uuid, text) from public, anon, authenticated;
grant execute on function public.campaign_email_sent(uuid, text) to service_role;

-- Cron: invoca la Edge Function cada 2 horas (envía bienvenidas y recordatorios
-- que estén pendientes). Requiere pg_cron + pg_net.
create extension if not exists pg_cron;
create extension if not exists pg_net;
do $$
begin
  if exists (select 1 from cron.job where jobname = 'nm-campaign-emails') then
    perform cron.unschedule('nm-campaign-emails');
  end if;
  perform cron.schedule(
    'nm-campaign-emails',
    '0 */2 * * *',
    $cron$
      select net.http_post(
        url := 'https://sboagswcehuxwfjdbhdn.supabase.co/functions/v1/campaign-emails',
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := '{}'::jsonb
      );
    $cron$
  );
end
$$;
