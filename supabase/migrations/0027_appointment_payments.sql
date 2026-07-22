-- ============================================================================
-- Citas: modalidad (presencial/en línea) + cobro digital opcional
-- ----------------------------------------------------------------------------
-- La solicitud de cita puede ser PRESENCIAL o EN LÍNEA. El especialista puede,
-- de forma OPCIONAL, fijar un importe a cobrar y el PORCENTAJE (100% o el que
-- señale). El paciente paga por la pasarela integrada (Stripe Connect) y el
-- webhook marca payment_status='paid'. Idempotente.
-- ============================================================================

alter table public.appointment_requests
  add column if not exists mode            text not null default 'in_person',  -- in_person | online
  add column if not exists charge_total     numeric,
  add column if not exists charge_percent   int not null default 100,
  add column if not exists charge_currency  text,
  add column if not exists payment_status   text not null default 'none';       -- none | pending | paid

-- Reemplaza request_appointment para aceptar modalidad + configuración de cobro.
drop function if exists public.request_appointment(bigint, text, timestamptz, timestamptz, text, text, text);

create or replace function public.request_appointment(
  p_recipient_member_no bigint,
  p_title           text,
  p_starts          timestamptz,
  p_ends            timestamptz default null,
  p_location        text default null,
  p_online_url      text default null,
  p_note            text default null,
  p_mode            text default 'in_person',
  p_charge_total    numeric default null,
  p_charge_percent  int default 100,
  p_charge_currency text default null
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_specialist uuid := auth.uid();
  v_recipient  uuid;
  v_role       text;
  v_spec_name  text;
  v_req        uuid;
  v_mode       text := case when p_mode = 'online' then 'online' else 'in_person' end;
  v_pct        int  := greatest(1, least(100, coalesce(p_charge_percent, 100)));
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
    (specialist_id, recipient_id, title, starts_at, ends_at, location, online_url, note,
     mode, charge_total, charge_percent, charge_currency,
     payment_status)
  values
    (v_specialist, v_recipient, btrim(p_title), p_starts, p_ends, p_location, p_online_url, p_note,
     v_mode,
     case when p_charge_total is not null and p_charge_total > 0 then p_charge_total else null end,
     v_pct,
     nullif(btrim(coalesce(p_charge_currency, '')), ''),
     case when p_charge_total is not null and p_charge_total > 0 then 'pending' else 'none' end)
  returning id into v_req;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_recipient, 'appt_request',
    'Nueva solicitud de cita',
    coalesce(v_spec_name,'') || ' te solicita agendar una cita.',
    json_build_object('request_id', v_req, 'specialist_id', v_specialist,
                      'specialist_name', coalesce(v_spec_name,''),
                      'title', btrim(p_title), 'starts_at', p_starts, 'mode', v_mode)
  );

  return json_build_object('ok', true, 'request_id', v_req);
end;
$$;

grant execute on function public.request_appointment(bigint, text, timestamptz, timestamptz, text, text, text, text, numeric, int, text) to authenticated;
