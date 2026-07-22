-- ============================================================================
-- Lista de espera automatizada + campañas (SMS / Email / push)
-- ----------------------------------------------------------------------------
-- A) Lista de espera: RPCs para que el paciente se apunte y el especialista la
--    gestione, MÁS automatización: si una cita se rechaza o cancela, se avisa
--    solo a quienes esperan a ese especialista (notificación in-app -> que a su
--    vez dispara el push nativo por el trigger de 0030).
-- B) Campañas: el especialista redacta un mensaje y lo envía a su lista de
--    espera o a sus pacientes por los canales que elija. El envío real lo hace
--    la Edge Function send-campaign. Idempotente.
-- ============================================================================

-- ── A. Lista de espera ──────────────────────────────────────────────────────

-- El paciente se apunta a la lista de un especialista (por folio).
create or replace function public.waitlist_join(p_provider_member_no bigint, p_note text default null)
returns json
language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_provider uuid;
begin
  if v_me is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select id into v_provider from public.profiles where member_no = p_provider_member_no;
  if v_provider is null then return json_build_object('ok', false, 'error', 'provider_not_found'); end if;
  if v_provider = v_me then return json_build_object('ok', false, 'error', 'self'); end if;
  if exists (select 1 from public.waitlist w
             where w.provider_id = v_provider and w.patient_id = v_me and w.status = 'waiting') then
    return json_build_object('ok', false, 'error', 'already');
  end if;
  insert into public.waitlist (provider_id, patient_id, note) values (v_provider, v_me, nullif(btrim(coalesce(p_note,'')),''));
  insert into public.notifications (user_id, type, title, body, data)
    values (v_provider, 'waitlist_join', 'Lista de espera', 'Alguien se apuntó a tu lista de espera.', '{}'::jsonb);
  return json_build_object('ok', true);
end; $$;
revoke all on function public.waitlist_join(bigint, text) from public;
grant execute on function public.waitlist_join(bigint, text) to authenticated;

-- El especialista agrega a un paciente por folio.
create or replace function public.waitlist_add(p_patient_member_no bigint, p_note text default null)
returns json
language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_patient uuid; v_role text;
begin
  if v_me is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select role into v_role from public.profiles where id = v_me;
  if v_role not in ('provider','admin') then return json_build_object('ok', false, 'error', 'not_allowed'); end if;
  select id into v_patient from public.profiles where member_no = p_patient_member_no;
  if v_patient is null then return json_build_object('ok', false, 'error', 'patient_not_found'); end if;
  if exists (select 1 from public.waitlist w
             where w.provider_id = v_me and w.patient_id = v_patient and w.status = 'waiting') then
    return json_build_object('ok', false, 'error', 'already');
  end if;
  insert into public.waitlist (provider_id, patient_id, note) values (v_me, v_patient, nullif(btrim(coalesce(p_note,'')),''));
  return json_build_object('ok', true);
end; $$;
revoke all on function public.waitlist_add(bigint, text) from public;
grant execute on function public.waitlist_add(bigint, text) to authenticated;

-- Lista de espera del especialista, con nombre y folio del paciente.
create or replace function public.my_waitlist()
returns table (id uuid, patient_id uuid, patient_name text, patient_member_no bigint, note text, status text, created_at timestamptz)
language sql security definer set search_path = public as $$
  select w.id, w.patient_id, coalesce(p.full_name, p.business_name) as patient_name,
         p.member_no, w.note, w.status, w.created_at
  from public.waitlist w
  left join public.profiles p on p.id = w.patient_id
  where w.provider_id = auth.uid()
  order by w.created_at asc;
$$;
revoke all on function public.my_waitlist() from public;
grant execute on function public.my_waitlist() to authenticated;

create or replace function public.waitlist_set_status(p_id uuid, p_status text)
returns json
language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p_status not in ('waiting','assigned','declined','cancelled') then
    return json_build_object('ok', false, 'error', 'bad_status');
  end if;
  update public.waitlist set status = p_status
    where id = p_id and (provider_id = v_me or patient_id = v_me);
  if not found then return json_build_object('ok', false, 'error', 'not_found'); end if;
  return json_build_object('ok', true);
end; $$;
revoke all on function public.waitlist_set_status(uuid, text) from public;
grant execute on function public.waitlist_set_status(uuid, text) to authenticated;

-- Aviso manual de hueco disponible a toda la lista en espera.
create or replace function public.waitlist_notify_slot(p_message text default null)
returns json
language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_name text; v_n int := 0;
begin
  if v_me is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select coalesce(business_name, full_name) into v_name from public.profiles where id = v_me;
  insert into public.notifications (user_id, type, title, body, data)
  select w.patient_id, 'waitlist_slot', 'Hay un lugar disponible',
         coalesce(nullif(btrim(coalesce(p_message,'')),''),
                  'Se liberó un espacio con ' || coalesce(v_name,'tu especialista') || '.'),
         json_build_object('provider', v_me, 'provider_name', coalesce(v_name,''))
  from public.waitlist w
  where w.provider_id = v_me and w.status = 'waiting';
  get diagnostics v_n = row_count;
  return json_build_object('ok', true, 'notified', v_n);
end; $$;
revoke all on function public.waitlist_notify_slot(text) from public;
grant execute on function public.waitlist_notify_slot(text) to authenticated;

-- AUTOMATIZACIÓN: si una cita se rechaza/cancela, avisa a la lista de espera.
create or replace function public.tg_waitlist_on_free_slot()
returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if NEW.status in ('rejected','cancelled') and coalesce(OLD.status,'') <> NEW.status then
    select coalesce(business_name, full_name) into v_name from public.profiles where id = NEW.specialist_id;
    insert into public.notifications (user_id, type, title, body, data)
    select w.patient_id, 'waitlist_slot', 'Hay un lugar disponible',
           'Se liberó un espacio con ' || coalesce(v_name,'tu especialista') || '.',
           json_build_object('provider', NEW.specialist_id, 'provider_name', coalesce(v_name,''),
                             'starts_at', NEW.starts_at)
    from public.waitlist w
    where w.provider_id = NEW.specialist_id and w.status = 'waiting';
  end if;
  return NEW;
exception when others then
  return NEW;
end; $$;

drop trigger if exists trg_waitlist_free_slot on public.appointment_requests;
create trigger trg_waitlist_free_slot after update on public.appointment_requests
  for each row execute function public.tg_waitlist_on_free_slot();

-- ── B. Campañas ─────────────────────────────────────────────────────────────
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  channels text[] not null default '{push}',
  audience text not null default 'waitlist' check (audience in ('waitlist','patients')),
  status text not null default 'draft' check (status in ('draft','sending','sent','failed')),
  sent_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists campaigns_owner_idx on public.campaigns(owner_id, created_at desc);

alter table public.campaigns enable row level security;
drop policy if exists campaigns_own on public.campaigns;
create policy campaigns_own on public.campaigns
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Destinatarios de una campaña (solo del dueño). La usa send-campaign.
create or replace function public.campaign_recipients(p_campaign_id uuid)
returns table (user_id uuid, full_name text, phone text)
language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_audience text;
begin
  select owner_id, audience into v_owner, v_audience from public.campaigns where id = p_campaign_id;
  if v_owner is null then return; end if;
  if auth.uid() is not null and auth.uid() <> v_owner then return; end if;
  if v_audience = 'waitlist' then
    return query
      select distinct w.patient_id, coalesce(p.full_name, p.business_name), p.phone
      from public.waitlist w left join public.profiles p on p.id = w.patient_id
      where w.provider_id = v_owner and w.status = 'waiting';
  else
    return query
      select distinct a.recipient_id, coalesce(p.full_name, p.business_name), p.phone
      from public.appointment_requests a left join public.profiles p on p.id = a.recipient_id
      where a.specialist_id = v_owner and a.status = 'accepted';
  end if;
end; $$;
revoke all on function public.campaign_recipients(uuid) from public;
grant execute on function public.campaign_recipients(uuid) to authenticated, service_role;
