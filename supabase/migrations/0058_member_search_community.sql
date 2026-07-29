-- ============================================================================
-- 0058 — Mensajería: profesionales abiertos entre sí + consumidores por relación
--
-- Reglas de negocio (definidas con el usuario):
--   · PROFESIONAL ↔ PROFESIONAL (role='provider': especialistas, comercios y
--     escuelas) → pueden escribirse SIN contacto previo. Son cuentas de negocio,
--     verificadas y públicas en el directorio; habilita colaboración y referencias.
--   · Cuando interviene un CONSUMIDOR (paciente/familia) → solo se permite si YA
--     existe relación entre ambos:
--       - un hilo de mensajes previo,
--       - una solicitud de cita (appointment_requests: specialist_id ↔ recipient_id),
--       - un pedido de tienda (orders: buyer_id ↔ vendor_id),
--       - una transacción de descuento (discount_transactions: provider_id ↔ parent_id).
--     Una solicitud de cita del paciente cuenta como su CONSENTIMIENTO.
--   · El admin puede escribir a cualquiera (moderación/soporte).
--
-- Esto evita el contacto en frío hacia familias/pacientes (posibles menores),
-- que es el riesgo real, y deja libre la red profesional.
--
-- El buscador de la mensajería (search_contacts) devuelve TUS contactos y, si
-- eres profesional/admin, también a los profesionales publicados (para poder
-- iniciar chats profesionales). Nunca expone a consumidores ajenos.
--
-- Idempotente. Aplicar después de la 0057.
-- ============================================================================

-- ── 1. Búsqueda para la mensajería ──────────────────────────────────────────
drop function if exists public.search_contacts(text);
create or replace function public.search_contacts(p_query text)
returns table (
  member_no bigint,
  full_name text,
  business_name text,
  avatar_url text,
  role text,
  country text
)
language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_q      text := btrim(coalesce(p_query, ''));
  v_digits text := regexp_replace(coalesce(p_query, ''), '\D', '', 'g');
  v_role   text;
begin
  if v_uid is null then return; end if;
  select pr.role into v_role from public.profiles pr where pr.id = v_uid;

  return query
  select p.member_no, p.full_name, p.business_name, p.avatar_url, p.role, p.country
    from public.profiles p
   where p.member_no is not null
     and p.id <> v_uid
     and (
       -- (a) tus contactos: con quienes ya existe relación
       p.id in (
         select case when m.sender_id = v_uid then m.recipient_id else m.sender_id end
           from public.messages m where m.sender_id = v_uid or m.recipient_id = v_uid
         union
         select case when a.specialist_id = v_uid then a.recipient_id else a.specialist_id end
           from public.appointment_requests a where a.specialist_id = v_uid or a.recipient_id = v_uid
         union
         select case when o.buyer_id = v_uid then o.vendor_id else o.buyer_id end
           from public.orders o where o.buyer_id = v_uid or o.vendor_id = v_uid
         union
         select case when d.provider_id = v_uid then d.parent_id else d.provider_id end
           from public.discount_transactions d where d.provider_id = v_uid or d.parent_id = v_uid
       )
       -- (b) si eres profesional/admin: también otros profesionales publicados
       or (v_role in ('provider', 'admin') and p.role = 'provider' and p.is_published)
     )
     and (
       v_q = ''
       or (v_digits <> '' and p.member_no = v_digits::bigint)
       or p.full_name ilike '%' || v_q || '%'
       or coalesce(p.business_name, '') ilike '%' || v_q || '%'
     )
   order by p.full_name
   limit 25;
end;
$$;
grant execute on function public.search_contacts(text) to authenticated;

-- ── 2. send_message: profesional↔profesional libre; consumidor por relación ─
create or replace function public.send_message(p_recipient_member_no bigint, p_body text)
returns json
language plpgsql
security definer
set search_path = public
as $$
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
$$;
revoke all on function public.send_message(bigint, text) from public;
grant execute on function public.send_message(bigint, text) to authenticated;
