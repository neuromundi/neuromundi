-- ============================================================================
-- 0056 — Ciclo de vida de la cuenta: eliminación, suspensión y retención
--
-- CONTEXTO / DECISIONES
--  · La persona puede ELIMINAR su cuenta (borrado duro, ya existía la Edge
--    Function delete-account) o SUSPENDERLA 6 meses sin perder historial.
--  · Antes de eliminar se invita a suspender. Si aun así cancela, se le pide el
--    MOTIVO (costo, dificultad, defectos, no me es útil, otro…).
--  · Motivo "costo": NO se borra al instante. Se oculta el perfil y se marca una
--    ventana de retención de 24 h + se NOTIFICA al admin para que proponga un
--    plan. Si se borrara de inmediato, la propuesta no tendría a quién llegar.
--  · Suspensión: el perfil queda oculto (is_published=false, recordando el valor
--    previo) durante 6 meses. Al mes 5 (últimos 31 días) se envía un recordatorio
--    SEMANAL de que la eliminación está próxima. Cumplidos los 6 meses, se elimina
--    automáticamente (cron).
--  · El admin NO aprueba nada: solo ve estadística + ID + correo de quien cancela
--    o suspende (RPC admin_account_actions). Las cancelaciones por "costo" se le
--    reportan aparte para hacer una propuesta.
--
-- La bitácora `account_actions` NO tiene FK a profiles: debe SOBREVIVIR al
-- borrado del usuario para que la estadística no se pierda.
--
-- Idempotente. Requiere pg_cron (ya en uso). Aplicar después de la 0055.
-- ============================================================================

-- ── 1. Estado de suspensión / retención en el perfil ────────────────────────
alter table public.profiles add column if not exists suspended_at          timestamptz;
alter table public.profiles add column if not exists suspend_until         timestamptz;
alter table public.profiles add column if not exists pre_suspend_published boolean;
alter table public.profiles add column if not exists winback_until         timestamptz;

create index if not exists idx_profiles_suspend_until
  on public.profiles (suspend_until) where suspend_until is not null;

-- ── 2. Bitácora de acciones de cuenta (append-only, sin FK) ─────────────────
create table if not exists public.account_actions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid,               -- SIN FK: sobrevive al borrado del usuario
  email         text,               -- snapshot (el usuario puede dejar de existir)
  member_no     integer,
  role          text,
  action        text not null check (action in ('cancel','suspend','reactivate','winback_costo')),
  reason        text,               -- motivo de cancelación (canónico)
  reason_detail text,               -- texto libre cuando el motivo es 'otro'
  is_paid       boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists idx_account_actions_action on public.account_actions (action, created_at desc);
create index if not exists idx_account_actions_reason on public.account_actions (reason);

alter table public.account_actions enable row level security;
-- Nadie lee/escribe directo: todo pasa por funciones SECURITY DEFINER.
-- (Sin policies = acceso denegado por defecto con RLS activa.)

-- ── 3. notif_category: clasifica los tipos nuevos (para preferencias de push) ─
-- 'suspension_reminder' → cuenta del propio usuario (categoría "comunidad").
-- 'account_costo'       → aviso al admin (categoría "mensajes").
create or replace function public.notif_category(p_type text)
returns text
language sql immutable set search_path = public as $$
  select case
    when p_type like 'appt_%' or p_type in ('booking_request', 'waitlist_slot') then 'citas'
    when p_type in ('direct_message', 'admin_message', 'account_costo') then 'mensajes'
    when p_type in ('post_achievement', 'badge', 'waitlist_join', 'referral_use', 'referral_reward', 'directory_match', 'suspension_reminder') then 'comunidad'
    when p_type in ('commission_paid', 'donation_thanks') then 'transacciones'
    when p_type = 'campaign' then 'campanas'
    else 'otras'
  end;
$$;

-- ── 4. Helper: notificar a TODOS los administradores ────────────────────────
-- Solo lo llaman otras funciones SECURITY DEFINER; se revoca a los clientes para
-- que nadie pueda spamear a los admins.
create or replace function public.notify_admins(
  p_type text, p_title text, p_body text, p_data jsonb default '{}'::jsonb
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, type, title, body, data)
  select p.id, p_type, p_title, p_body, p_data
    from public.profiles p
   where p.role = 'admin';
end;
$$;
revoke all on function public.notify_admins(text, text, text, jsonb) from public, anon, authenticated;

-- ── 5. Suspender mi cuenta (6 meses, oculta, sin perder datos) ──────────────
create or replace function public.suspend_my_account()
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_until timestamptz := now() + interval '6 months';
  v_email text;
  v_role  text;
  v_member integer;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;

  select p.role, p.member_no into v_role, v_member
    from public.profiles p where p.id = v_uid;
  select u.email into v_email from auth.users u where u.id = v_uid;

  update public.profiles
     set suspended_at = now(),
         suspend_until = v_until,
         pre_suspend_published = coalesce(pre_suspend_published, is_published),
         is_published = false
   where id = v_uid;

  insert into public.account_actions (user_id, email, member_no, role, action, is_paid)
  values (v_uid, v_email, v_member, v_role, 'suspend', v_role <> 'parent');

  return v_until;
end;
$$;
grant execute on function public.suspend_my_account() to authenticated;

-- ── 6. Reactivar mi cuenta (revierte la suspensión o la retención) ──────────
create or replace function public.reactivate_my_account()
returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'No autenticado'; end if;

  update public.profiles
     set suspended_at = null,
         suspend_until = null,
         winback_until = null,
         is_published = coalesce(pre_suspend_published, is_published),
         pre_suspend_published = null
   where id = v_uid;

  insert into public.account_actions (user_id, email, member_no, role, action, is_paid)
  select v_uid, u.email, p.member_no, p.role, 'reactivate', p.role <> 'parent'
    from public.profiles p
    left join auth.users u on u.id = p.id
   where p.id = v_uid;
end;
$$;
grant execute on function public.reactivate_my_account() to authenticated;

-- ── 7. Cancelar mi cuenta: registra el motivo y decide qué hacer ────────────
-- Devuelve { deleted: bool, winback: bool }:
--   · 'costo'  → deleted=false, winback=true. El cliente muestra el mensaje de
--                propuesta en 24 h y NO llama a delete-account.
--   · otros    → deleted=true. El cliente procede a la Edge Function delete-account.
create or replace function public.cancel_my_account(p_reason text, p_detail text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_email  text;
  v_role   text;
  v_member integer;
  v_paid   boolean;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;

  select p.role, p.member_no into v_role, v_member
    from public.profiles p where p.id = v_uid;
  select u.email into v_email from auth.users u where u.id = v_uid;
  v_paid := v_role <> 'parent';

  if p_reason = 'costo' then
    -- Retención: se oculta el perfil y se abre ventana de 24 h. No se borra.
    update public.profiles
       set winback_until = now() + interval '24 hours',
           pre_suspend_published = coalesce(pre_suspend_published, is_published),
           is_published = false
     where id = v_uid;

    insert into public.account_actions
      (user_id, email, member_no, role, action, reason, reason_detail, is_paid)
    values
      (v_uid, v_email, v_member, v_role, 'winback_costo', p_reason, p_detail, v_paid);

    perform public.notify_admins(
      'account_costo',
      'Cancelación por costo',
      format('El miembro %s (%s) quiere cancelar por costo. Proponer un plan en 24 h.',
             coalesce(v_member::text, '—'), coalesce(v_email, '—')),
      jsonb_build_object('user_id', v_uid, 'email', v_email, 'member_no', v_member)
    );

    return jsonb_build_object('deleted', false, 'winback', true);
  end if;

  -- Otros motivos: se registra la cancelación; el cliente elimina la cuenta.
  insert into public.account_actions
    (user_id, email, member_no, role, action, reason, reason_detail, is_paid)
  values
    (v_uid, v_email, v_member, v_role, 'cancel', p_reason, p_detail, v_paid);

  return jsonb_build_object('deleted', true, 'winback', false);
end;
$$;
grant execute on function public.cancel_my_account(text, text) to authenticated;

-- ── 8. Estadística para el admin (solo ve, no aprueba) ──────────────────────
drop function if exists public.admin_account_actions();
create or replace function public.admin_account_actions()
returns table (
  id uuid, user_id uuid, email text, member_no integer, role text,
  action text, reason text, reason_detail text, is_paid boolean, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select a.id, a.user_id, a.email, a.member_no, a.role,
         a.action, a.reason, a.reason_detail, a.is_paid, a.created_at
    from public.account_actions a
   where public.is_admin()
   order by a.created_at desc;
$$;
grant execute on function public.admin_account_actions() to authenticated;

-- ── 9. Recordatorio semanal de eliminación próxima (últimos 31 días) ────────
create or replace function public.emit_suspension_reminders()
returns integer
language plpgsql security definer set search_path = public as $$
declare v_count integer := 0;
begin
  insert into public.notifications (user_id, type, title, body, data)
  select p.id, 'suspension_reminder',
         'Tu perfil se eliminará pronto',
         format('Tu cuenta suspendida se eliminará definitivamente el %s. Reactívala cuando quieras para conservar tu historial y progreso.',
                to_char(p.suspend_until, 'DD/MM/YYYY')),
         jsonb_build_object('suspend_until', p.suspend_until)
    from public.profiles p
   where p.suspend_until is not null
     and p.suspend_until > now()
     and p.suspend_until <= now() + interval '31 days'
     and not exists (
       select 1 from public.notifications n
        where n.user_id = p.id
          and n.type = 'suspension_reminder'
          and n.created_at > now() - interval '6 days'
     );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.emit_suspension_reminders() from public, anon, authenticated;

-- ── 10. Purga automática de suspensiones vencidas (6 meses) ─────────────────
-- Borra auth.users (cascada a profiles). Corre por cron como owner (postgres),
-- que sí tiene privilegios sobre el esquema auth.
create or replace function public.purge_expired_suspensions()
returns integer
language plpgsql security definer set search_path = public as $$
declare v_count integer := 0; v_id uuid;
begin
  for v_id in
    select p.id from public.profiles p
     where p.suspend_until is not null and p.suspend_until <= now()
  loop
    delete from auth.users where id = v_id;  -- cascada a profiles y datos
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.purge_expired_suspensions() from public, anon, authenticated;

-- ── 11. Programación de cron (idempotente) ──────────────────────────────────
-- Recordatorio: lunes 09:00. Purga: diaria 03:30.
do $$
begin
  perform cron.unschedule('nm-suspension-reminders');
exception when others then null;
end $$;
select cron.schedule('nm-suspension-reminders', '0 9 * * 1',
  $$select public.emit_suspension_reminders();$$);

do $$
begin
  perform cron.unschedule('nm-purge-suspensions');
exception when others then null;
end $$;
select cron.schedule('nm-purge-suspensions', '30 3 * * *',
  $$select public.purge_expired_suspensions();$$);
