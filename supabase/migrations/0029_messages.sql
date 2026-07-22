-- ============================================================================
-- Mensajería directa especialista <-> paciente/tutor
-- ----------------------------------------------------------------------------
-- Los especialistas (provider/admin) pueden INICIAR conversación por folio;
-- cualquiera puede RESPONDER dentro de un hilo existente. El envío pasa por la
-- RPC send_message (SECURITY DEFINER) que valida el permiso y notifica al
-- destinatario (type='direct_message'). Idempotente.
-- ============================================================================

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists messages_recipient_idx on public.messages (recipient_id, created_at desc);
create index if not exists messages_sender_idx on public.messages (sender_id, created_at desc);

alter table public.messages enable row level security;

drop policy if exists messages_select_participant on public.messages;
create policy messages_select_participant on public.messages
  for select using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- El destinatario puede marcar como leído (read_at) sus propios mensajes.
drop policy if exists messages_update_recipient on public.messages;
create policy messages_update_recipient on public.messages
  for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

-- ── Envío con validación de permiso + notificación ──────────────────────────
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
  if not (v_role in ('provider','admin') or exists (
        select 1 from public.messages m
        where (m.sender_id = v_sender and m.recipient_id = v_recipient)
           or (m.sender_id = v_recipient and m.recipient_id = v_sender))) then
    return json_build_object('ok', false, 'error', 'not_allowed');
  end if;
  insert into public.messages (sender_id, recipient_id, body)
    values (v_sender, v_recipient, v_body) returning id into v_id;
  insert into public.notifications (user_id, type, title, body, data)
    values (v_recipient, 'direct_message', 'Nuevo mensaje',
            coalesce(v_name,'Alguien') || ' te envió un mensaje.',
            json_build_object('from', v_sender, 'from_name', coalesce(v_name,''), 'message_id', v_id));
  return json_build_object('ok', true, 'message_id', v_id);
end;
$$;
revoke all on function public.send_message(bigint, text) from public;
grant execute on function public.send_message(bigint, text) to authenticated;

-- ── Resumen de conversaciones (otra parte + último mensaje + no leídos) ──────
create or replace function public.message_threads()
returns table (
  other_id uuid,
  other_name text,
  other_member_no bigint,
  other_avatar text,
  last_body text,
  last_at timestamptz,
  unread int
)
language sql
security definer
set search_path = public
as $$
  with me as (select auth.uid() as uid),
  parts as (
    select
      case when m.sender_id = (select uid from me) then m.recipient_id else m.sender_id end as other_id,
      m.body, m.created_at, m.recipient_id, m.read_at
    from public.messages m
    where m.sender_id = (select uid from me) or m.recipient_id = (select uid from me)
  )
  select
    p.other_id,
    coalesce(pr.business_name, pr.full_name) as other_name,
    pr.member_no as other_member_no,
    pr.avatar_url as other_avatar,
    (array_agg(p.body order by p.created_at desc))[1] as last_body,
    max(p.created_at) as last_at,
    count(*) filter (where p.recipient_id = (select uid from me) and p.read_at is null)::int as unread
  from parts p
  left join public.profiles pr on pr.id = p.other_id
  group by p.other_id, pr.business_name, pr.full_name, pr.member_no, pr.avatar_url
  order by max(p.created_at) desc;
$$;
revoke all on function public.message_threads() from public;
grant execute on function public.message_threads() to authenticated;
