-- ============================================================================
-- 0049 — Centro de preferencias de notificaciones
--
-- Hasta ahora TODA notificación in-app disparaba push nativo sin que el usuario
-- pudiera elegir qué recibir. Esta migración añade preferencias por CATEGORÍA y
-- un interruptor maestro de push, y hace que el trigger `tg_notify_push` los
-- respete: si la categoría está silenciada (o el push apagado), no se envía el
-- push. La notificación in-app (campana) SIEMPRE se guarda: no se pierde nada,
-- solo se deja de empujar al dispositivo.
--
-- Categorías (deben coincidir con src/lib/notificationPrefs.ts):
--   citas · mensajes · comunidad · transacciones · campanas · otras
--
-- Idempotente. Aplicar después de la 0048.
-- ============================================================================

create table if not exists public.notification_prefs (
  user_id         uuid primary key references public.profiles(id) on delete cascade,
  push_enabled    boolean not null default true,
  -- Categorías que el usuario NO quiere recibir por push.
  muted_categories text[] not null default '{}',
  updated_at      timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

-- Cada quien gestiona SOLO sus preferencias.
drop policy if exists notif_prefs_own on public.notification_prefs;
create policy notif_prefs_own on public.notification_prefs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Categoría de un tipo de notificación (misma tabla que el front) ─────────
create or replace function public.notif_category(p_type text)
returns text
language sql immutable set search_path = public as $$
  select case
    when p_type like 'appt_%' or p_type in ('booking_request', 'waitlist_slot') then 'citas'
    when p_type in ('direct_message', 'admin_message') then 'mensajes'
    when p_type in ('post_achievement', 'badge', 'waitlist_join', 'referral_use', 'referral_reward') then 'comunidad'
    when p_type in ('commission_paid', 'donation_thanks') then 'transacciones'
    when p_type = 'campaign' then 'campanas'
    else 'otras'
  end;
$$;

-- ── Trigger de push que respeta las preferencias ────────────────────────────
create or replace function public.tg_notify_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_push_enabled boolean := true;
  v_muted text[] := '{}';
  v_cat text := public.notif_category(NEW.type);
begin
  -- Preferencias del destinatario (si no tiene fila, valores por defecto: todo activo).
  select np.push_enabled, np.muted_categories
    into v_push_enabled, v_muted
    from public.notification_prefs np
    where np.user_id = NEW.user_id;

  -- Push apagado, o categoría silenciada → no se empuja (la campana ya la tiene).
  if coalesce(v_push_enabled, true) = false then
    return NEW;
  end if;
  if v_muted is not null and v_cat = any(v_muted) then
    return NEW;
  end if;

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
