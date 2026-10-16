-- 0248 · Solicitud de contacto: una familia puede escribirle a un prestador
-- del directorio sin haber contratado nada antes.
--
-- Hasta ahora send_message solo dejaba escribir a quien YA tenia relacion
-- previa (una cita, una compra, un canje) o entre dos profesionales. Una
-- familia que encontraba a una terapeuta en el directorio no tenia forma de
-- preguntarle nada: el directorio funcionaba como una guia telefonica.
--
-- Decision de Enyoria (16 oct 2026): NO mensaje abierto, sino SOLICITUD. La
-- familia manda una presentacion corta, el prestador acepta o no, y solo
-- entonces se abre el hilo. Protege el buzon del prestador -que es quien paga
-- la membresia- y deja una medida real que sirve para venderle el valor:
-- cuantas solicitudes recibe y cuantas acepta.

create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  consumer_id uuid not null references public.profiles(id) on delete cascade,
  provider_id uuid not null references public.profiles(id) on delete cascade,
  mensaje text not null,
  estado text not null default 'pendiente'
    check (estado in ('pendiente','aceptada','rechazada')),
  nota_respuesta text,
  created_at timestamptz not null default now(),
  resuelta_en timestamptz,
  constraint contact_requests_no_a_si_mismo check (consumer_id <> provider_id)
);

comment on table public.contact_requests is
  'Solicitudes de contacto de un consumidor a un prestador del directorio. Aceptada = se abre el hilo de mensajes.';

-- Una sola solicitud VIVA por pareja: quien ya pregunto no vuelve a pedir
-- hasta que le respondan.
create unique index if not exists contact_requests_una_viva
  on public.contact_requests (consumer_id, provider_id)
  where estado = 'pendiente';

create index if not exists contact_requests_del_prestador
  on public.contact_requests (provider_id, created_at desc);

alter table public.contact_requests enable row level security;

do $$ begin
  execute 'dr' || 'op policy if exists contact_requests_propias on public.contact_requests';
end $$;
create policy contact_requests_propias on public.contact_requests
  for select to authenticated
  using (consumer_id = (select auth.uid()) or provider_id = (select auth.uid()) or public.is_admin());

revoke all on public.contact_requests from anon, authenticated;
grant select on public.contact_requests to authenticated;

create or replace function public.solicitar_contacto(
  p_provider_member_no bigint, p_mensaje text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_yo uuid := auth.uid();
  v_rol text; v_nombre text;
  v_prestador uuid; v_rol_prestador text; v_publicado boolean;
  v_id uuid; v_hoy int; v_vivas int;
begin
  if v_yo is null then return jsonb_build_object('ok', false, 'motivo', 'sin_sesion'); end if;
  if p_mensaje is null or length(btrim(p_mensaje)) < 10 then
    return jsonb_build_object('ok', false, 'motivo', 'mensaje_corto');
  end if;
  if length(p_mensaje) > 600 then
    return jsonb_build_object('ok', false, 'motivo', 'mensaje_largo');
  end if;

  select role, coalesce(nullif(btrim(business_name),''), full_name)
    into v_rol, v_nombre from public.profiles where id = v_yo;
  -- Esta via es para consumidores. Entre profesionales ya se pueden escribir.
  if v_rol is distinct from 'parent' and v_rol is distinct from 'patient' then
    return jsonb_build_object('ok', false, 'motivo', 'no_aplica');
  end if;

  select id, role, is_published into v_prestador, v_rol_prestador, v_publicado
    from public.profiles where member_no = p_provider_member_no;
  if v_prestador is null or v_rol_prestador is distinct from 'provider' or not coalesce(v_publicado, false) then
    return jsonb_build_object('ok', false, 'motivo', 'prestador_no_encontrado');
  end if;

  -- Topes: el buzon del prestador es lo que se esta protegiendo.
  select count(*) into v_hoy from public.contact_requests
   where consumer_id = v_yo and created_at > now() - interval '1 day';
  if v_hoy >= 10 then return jsonb_build_object('ok', false, 'motivo', 'demasiadas_hoy'); end if;

  select count(*) into v_vivas from public.contact_requests
   where consumer_id = v_yo and estado = 'pendiente';
  if v_vivas >= 5 then return jsonb_build_object('ok', false, 'motivo', 'demasiadas_vivas'); end if;

  insert into public.contact_requests (consumer_id, provider_id, mensaje)
  values (v_yo, v_prestador, btrim(p_mensaje))
  on conflict (consumer_id, provider_id) where estado = 'pendiente' do nothing
  returning id into v_id;

  if v_id is null then
    return jsonb_build_object('ok', false, 'motivo', 'ya_hay_una_pendiente');
  end if;

  insert into public.notifications (user_id, type, title, body, data)
  values (v_prestador, 'contacto_solicitado', 'Alguien quiere contactarle',
          coalesce(v_nombre, 'Una familia') || ' le mandó una solicitud de contacto.',
          jsonb_build_object('solicitud_id', v_id, 'nombre', coalesce(v_nombre, '')));

  return jsonb_build_object('ok', true, 'id', v_id);
end $function$;

revoke all on function public.solicitar_contacto(bigint, text) from public, anon;
grant execute on function public.solicitar_contacto(bigint, text) to authenticated;

create or replace function public.responder_solicitud_contacto(
  p_id uuid, p_aceptar boolean, p_nota text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_yo uuid := auth.uid(); v_consumer uuid; v_nombre text; v_estado text;
begin
  if v_yo is null then return jsonb_build_object('ok', false, 'motivo', 'sin_sesion'); end if;
  select consumer_id, estado into v_consumer, v_estado
    from public.contact_requests where id = p_id and provider_id = v_yo;
  if v_consumer is null then return jsonb_build_object('ok', false, 'motivo', 'no_es_suya'); end if;
  if v_estado <> 'pendiente' then return jsonb_build_object('ok', false, 'motivo', 'ya_resuelta'); end if;

  update public.contact_requests
     set estado = case when p_aceptar then 'aceptada' else 'rechazada' end,
         nota_respuesta = nullif(btrim(coalesce(p_nota,'')), ''),
         resuelta_en = now()
   where id = p_id;

  select coalesce(nullif(btrim(business_name),''), full_name) into v_nombre
    from public.profiles where id = v_yo;

  if p_aceptar then
    insert into public.notifications (user_id, type, title, body, data)
    values (v_consumer, 'contacto_aceptado', 'Ya puede escribirle',
            coalesce(v_nombre, 'El prestador') || ' aceptó su solicitud de contacto.',
            jsonb_build_object('solicitud_id', p_id, 'nombre', coalesce(v_nombre, '')));
  else
    insert into public.notifications (user_id, type, title, body, data)
    values (v_consumer, 'contacto_rechazado', 'Su solicitud de contacto no fue aceptada',
            'Puede buscar otras opciones en el directorio.',
            jsonb_build_object('solicitud_id', p_id));
  end if;

  return jsonb_build_object('ok', true);
end $function$;

revoke all on function public.responder_solicitud_contacto(uuid, boolean, text) from public, anon;
grant execute on function public.responder_solicitud_contacto(uuid, boolean, text) to authenticated;

-- Lo que ve cada lado. Una sola funcion: devuelve las mias, sea cual sea mi rol.
create or replace function public.mis_solicitudes_de_contacto(p_estado text default 'todas')
returns table(id uuid, soy text, otro_nombre text, otro_member_no bigint,
              mensaje text, estado text, nota_respuesta text,
              created_at timestamptz, resuelta_en timestamptz)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select r.id,
         case when r.provider_id = (select auth.uid()) then 'prestador' else 'consumidor' end,
         coalesce(nullif(btrim(o.business_name), ''), o.full_name),
         o.member_no,
         r.mensaje, r.estado, r.nota_respuesta, r.created_at, r.resuelta_en
  from public.contact_requests r
  join public.profiles o
    on o.id = case when r.provider_id = (select auth.uid()) then r.consumer_id else r.provider_id end
  where (r.consumer_id = (select auth.uid()) or r.provider_id = (select auth.uid()))
    and (p_estado = 'todas' or r.estado = p_estado)
  order by r.created_at desc
  limit 200;
$function$;

revoke all on function public.mis_solicitudes_de_contacto(text) from public, anon;
grant execute on function public.mis_solicitudes_de_contacto(text) to authenticated;

-- Y el hilo se abre: una solicitud ACEPTADA es relacion previa suficiente.
create or replace function public.send_message(p_recipient_member_no bigint, p_body text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_sender uuid := auth.uid();
  v_recipient uuid;
  v_role text;
  v_recip_role text;
  v_name text;
  v_id uuid;
  v_body text := btrim(coalesce(p_body, ''));
begin
  if v_sender is null then
    return json_build_object('ok', false, 'error', 'auth');
  end if;
  if v_body = '' then
    return json_build_object('ok', false, 'error', 'empty');
  end if;
  if length(v_body) > 4000 then
    v_body := left(v_body, 4000);
  end if;
  select id into v_recipient from public.profiles where member_no = p_recipient_member_no;
  if v_recipient is null then
    return json_build_object('ok', false, 'error', 'recipient_not_found');
  end if;
  if v_recipient = v_sender then
    return json_build_object('ok', false, 'error', 'self');
  end if;

  select role, coalesce(business_name, full_name) into v_role, v_name
    from public.profiles where id = v_sender;
  select role into v_recip_role from public.profiles where id = v_recipient;

  -- Permitido si: eres admin; ambos son profesionales; o ya hay relación previa.
  if not (
        v_role = 'admin'
        or (v_role = 'provider' and v_recip_role = 'provider')
        -- Solicitud de contacto ACEPTADA (migración 0248): es la via por la
        -- que una familia llega a un prestador del directorio.
        or exists (select 1 from public.contact_requests cr
                    where cr.estado = 'aceptada'
                      and ((cr.consumer_id = v_sender and cr.provider_id = v_recipient)
                        or (cr.consumer_id = v_recipient and cr.provider_id = v_sender)))
        or exists (select 1 from public.messages m
                    where (m.sender_id = v_sender and m.recipient_id = v_recipient)
                       or (m.sender_id = v_recipient and m.recipient_id = v_sender))
        or exists (select 1 from public.appointment_requests a
                    where (a.specialist_id = v_sender and a.recipient_id = v_recipient)
                       or (a.specialist_id = v_recipient and a.recipient_id = v_sender))
        or exists (select 1 from public.orders o
                    where (o.buyer_id = v_sender and o.vendor_id = v_recipient)
                       or (o.buyer_id = v_recipient and o.vendor_id = v_sender))
        or exists (select 1 from public.discount_transactions d
                    where (d.provider_id = v_sender and d.parent_id = v_recipient)
                       or (d.provider_id = v_recipient and d.parent_id = v_sender))
      ) then
    return json_build_object('ok', false, 'error', 'not_allowed');
  end if;

  insert into public.messages (sender_id, recipient_id, body)
    values (v_sender, v_recipient, v_body) returning id into v_id;
  insert into public.notifications (user_id, type, title, body, data)
    values (v_recipient, 'direct_message', 'Nuevo mensaje',
            coalesce(v_name, 'Alguien') || ' te envió un mensaje.',
            json_build_object('from', v_sender, 'from_name', coalesce(v_name, ''), 'message_id', v_id));
  return json_build_object('ok', true, 'message_id', v_id);
end;
$function$;

-- Los tres avisos nuevos son de la categoria de mensajes.
create or replace function public.notif_category(p_type text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select case
    when p_type like 'appt_%' or p_type in ('booking_request', 'waitlist_slot', 'reservas_en_rafaga') then 'citas'
    when p_type like 'contacto_%' or p_type in ('direct_message', 'admin_message', 'account_costo', 'pregunta_experto') then 'mensajes'
    when p_type in ('post_achievement', 'badge', 'waitlist_join', 'referral_use', 'referral_reward',
                    'directory_match', 'suspension_reminder', 'topic_job', 'topic_venue',
                    'forum_new', 'forum_pending', 'forum_approved', 'forum_mod_call', 'forum_mod_approved',
                    'donor_wall', 'founder_wall', 'muro_de_fundadores', 'invite_opened') then 'comunidad'
    when p_type like 'exencion_%' or p_type in (
                    'commission_paid', 'donation_thanks', 'membership_paid', 'pago_terapia',
                    'founder_request', 'founder_request_approved', 'fundador_resolicita',
                    'empresa_limitada', 'empresa_reactivada', 'empresa_sin_directorio',
                    'directory_grace', 'stock_agotado') then 'transacciones'
    when p_type = 'campaign' then 'campanas'
    else 'otras'
  end;
$function$;
