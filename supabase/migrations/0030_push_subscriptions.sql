-- ============================================================================
-- Push nativo (Web Push / VAPID)
-- ----------------------------------------------------------------------------
-- Guarda las suscripciones push del navegador y dispara la Edge Function
-- send-push cada vez que se crea una notificación in-app, de modo que TODA
-- notificación (citas, recordatorios, mensajes, admin) llega también como push
-- nativo si el usuario lo activó. Idempotente. Requiere secrets VAPID_* y que
-- send-push esté desplegada.
-- ============================================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subs_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;
drop policy if exists push_subs_own on public.push_subscriptions;
create policy push_subs_own on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create extension if not exists pg_net;

-- Al insertar una notificación, invoca send-push (best-effort; nunca bloquea).
create or replace function public.tg_notify_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://sboagswcehuxwfjdbhdn.supabase.co/functions/v1/send-push',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := json_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', NEW.body,
      'data', NEW.data
    )::jsonb
  );
  return NEW;
exception when others then
  return NEW;
end;
$$;

drop trigger if exists trg_notify_push on public.notifications;
create trigger trg_notify_push after insert on public.notifications
  for each row execute function public.tg_notify_push();
