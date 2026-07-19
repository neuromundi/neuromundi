-- ============================================================================
-- Solicitudes de cita del especialista al paciente / padre-tutor
-- ----------------------------------------------------------------------------
-- El especialista (prestador) solicita agendar una cita en el calendario del
-- paciente/tutor. La plataforma notifica al destinatario; éste acepta (se crea
-- la entrada en SU calendario) o rechaza indicando el motivo. El especialista
-- recibe la confirmación o el motivo del rechazo. Recordatorio 24 h antes.
-- Toda escritura pasa por funciones SECURITY DEFINER (las notificaciones a otro
-- usuario no son posibles con RLS directa). Idempotente.
-- ============================================================================

create table if not exists public.appointment_requests (
  id                uuid primary key default gen_random_uuid(),
  specialist_id     uuid not null references auth.users(id) on delete cascade,
  recipient_id      uuid not null references auth.users(id) on delete cascade,
  title             text not null,
  starts_at         timestamptz not null,
  ends_at           timestamptz,
  location          text,
  online_url        text,
  note              text,
  status            text not null default 'pending' check (status in ('pending','accepted','rejected')),
  rejection_reason  text,
  calendar_entry_id uuid references public.calendar_entries(id) on delete set null,
  reminded_at       timestamptz,
  responded_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists appt_req_recipient_idx on public.appointment_requests (recipient_id, status, starts_at);
create index if not exists appt_req_specialist_idx on public.appointment_requests (specialist_id, created_at desc);

alter table public.appointment_requests enable row level security;

-- Las partes involucradas pueden leer sus solicitudes.
drop policy if exists "appt_req_select_involved" on public.appointment_requests;
create policy "appt_req_select_involved" on public.appointment_requests
  for select using (auth.uid() = specialist_id or auth.uid() = recipient_id);

drop policy if exists "appt_req_admin_all" on public.appointment_requests;
create policy "appt_req_admin_all" on public.appointment_requests
  for all using (public.is_admin()) with check (public.is_admin());

-- ── RPC: el especialista solicita una cita (por folio NM del destinatario) ────
create or replace function public.request_appointment(
  p_recipient_member_no bigint,
  p_title      text,
  p_starts     timestamptz,
  p_ends       timestamptz default null,
  p_location   text default null,
  p_online_url text default null,
  p_note       text default null
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_specialist uuid := auth.uid();
  v_recipient  uuid;
  v_role       text;
  v_spec_name  text;
  v_req        uuid;
begin
  if v_specialist is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select role, coalesce(business_name, full_name) into v_role, v_spec_name
    from public.profiles where id = v_specialist;
  if v_role is distinct from 'provider' then
    return json_build_object('ok', false, 'error', 'not_provider');
  end if;
  select id into v_recipient from public.profiles where member_no = p_recipient_member_no;
  if v_recipient is null then return json_build_object('ok', false, 'error', 'recipient_not_found'); end if;
  if v_recipient = v_specialist then return json_build_object('ok', false, 'error', 'self'); end if;
  if p_starts is null or p_title is null or length(btrim(p_title)) = 0 then
    return json_build_object('ok', false, 'error', 'invalid');
  end if;

  insert into public.appointment_requests
    (specialist_id, recipient_id, title, starts_at, ends_at, location, online_url, note)
  values
    (v_specialist, v_recipient, btrim(p_title), p_starts, p_ends, p_location, p_online_url, p_note)
  returning id into v_req;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_recipient, 'appt_request',
    'Nueva solicitud de cita',
    coalesce(v_spec_name,'') || ' te solicita agendar una cita.',
    json_build_object('request_id', v_req, 'specialist_id', v_specialist,
                      'specialist_name', coalesce(v_spec_name,''),
                      'title', btrim(p_title), 'starts_at', p_starts)
  );

  return json_build_object('ok', true, 'request_id', v_req);
end;
$$;

-- ── RPC: el destinatario acepta o rechaza (con motivo) ───────────────────────
create or replace function public.respond_appointment(
  p_request uuid,
  p_accept  boolean,
  p_reason  text default null
) returns json
language plpgsql security definer set search_path = public as $$
declare
  r           public.appointment_requests;
  v_me        uuid := auth.uid();
  v_recip_name text;
  v_entry     uuid;
begin
  if v_me is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into r from public.appointment_requests where id = p_request;
  if not found then return json_build_object('ok', false, 'error', 'not_found'); end if;
  if r.recipient_id <> v_me then return json_build_object('ok', false, 'error', 'forbidden'); end if;
  if r.status <> 'pending' then return json_build_object('ok', false, 'error', 'already'); end if;

  select coalesce(business_name, full_name) into v_recip_name from public.profiles where id = v_me;

  if p_accept then
    insert into public.calendar_entries (user_id, title, starts_at, ends_at, location, online_url, kind)
    values (v_me, r.title, r.starts_at, r.ends_at, r.location, r.online_url, 'appointment')
    returning id into v_entry;

    update public.appointment_requests
      set status = 'accepted', calendar_entry_id = v_entry, responded_at = now(), updated_at = now()
      where id = r.id;

    insert into public.notifications (user_id, type, title, body, data)
    values (r.specialist_id, 'appt_accepted', 'Cita aceptada',
      coalesce(v_recip_name,'') || ' aceptó tu solicitud de cita.',
      json_build_object('request_id', r.id, 'title', r.title, 'starts_at', r.starts_at,
                        'recipient_name', coalesce(v_recip_name,'')));
  else
    update public.appointment_requests
      set status = 'rejected', rejection_reason = p_reason, responded_at = now(), updated_at = now()
      where id = r.id;

    insert into public.notifications (user_id, type, title, body, data)
    values (r.specialist_id, 'appt_rejected', 'Cita rechazada',
      coalesce(v_recip_name,'') || ' rechazó tu solicitud de cita.',
      json_build_object('request_id', r.id, 'title', r.title, 'reason', coalesce(p_reason,''),
                        'recipient_name', coalesce(v_recip_name,'')));
  end if;

  return json_build_object('ok', true);
end;
$$;

-- ── RPC: recordatorio 24 h (para el usuario actual, como fallback cliente) ────
create or replace function public.emit_due_appointment_reminders()
returns int
language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_count int := 0; r record;
begin
  if v_me is null then return 0; end if;
  for r in
    select * from public.appointment_requests
    where recipient_id = v_me and status = 'accepted' and reminded_at is null
      and starts_at > now() and starts_at <= now() + interval '24 hours'
  loop
    insert into public.notifications (user_id, type, title, body, data)
    values (v_me, 'appt_reminder', 'Recordatorio de cita',
      'Tu cita "' || r.title || '" es en menos de 24 horas.',
      json_build_object('request_id', r.id, 'title', r.title, 'starts_at', r.starts_at));
    update public.appointment_requests set reminded_at = now() where id = r.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ── RPC global para cron (todos los usuarios). Programar con pg_cron si está ──
-- disponible. Recorre TODAS las citas aceptadas próximas sin recordar.
create or replace function public.emit_all_due_appointment_reminders()
returns int
language plpgsql security definer set search_path = public as $$
declare v_count int := 0; r record;
begin
  for r in
    select * from public.appointment_requests
    where status = 'accepted' and reminded_at is null
      and starts_at > now() and starts_at <= now() + interval '24 hours'
  loop
    insert into public.notifications (user_id, type, title, body, data)
    values (r.recipient_id, 'appt_reminder', 'Recordatorio de cita',
      'Tu cita "' || r.title || '" es en menos de 24 horas.',
      json_build_object('request_id', r.id, 'title', r.title, 'starts_at', r.starts_at));
    update public.appointment_requests set reminded_at = now() where id = r.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

grant execute on function public.request_appointment(bigint, text, timestamptz, timestamptz, text, text, text) to authenticated;
grant execute on function public.respond_appointment(uuid, boolean, text) to authenticated;
grant execute on function public.emit_due_appointment_reminders() to authenticated;

-- Programación opcional del recordatorio global (requiere la extensión pg_cron):
--   select cron.schedule('nm-appt-reminders', '*/30 * * * *',
--     $$ select public.emit_all_due_appointment_reminders(); $$);
