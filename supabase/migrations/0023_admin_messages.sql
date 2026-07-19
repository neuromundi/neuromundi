-- ============================================================================
-- Mensajería interna del administrador
-- ----------------------------------------------------------------------------
-- El admin envía mensajes DIRECTOS (a un usuario por folio NM) o en GRUPO (a una
-- audiencia: todos / familias y pacientes / prestadores / fundadores). La entrega
-- se hace creando una notificación por destinatario (tabla notifications), que el
-- usuario ya ve en la campana. Guarda un registro de lo enviado en admin_messages.
-- Toda la escritura pasa por una función SECURITY DEFINER acotada a is_admin().
-- Idempotente.
-- ============================================================================

create table if not exists public.admin_messages (
  id              uuid primary key default gen_random_uuid(),
  sender_id       uuid references auth.users(id) on delete set null,
  title           text,
  body            text not null,
  audience        text not null,                 -- all | consumers | providers | founders | direct
  recipient_id    uuid references auth.users(id) on delete set null,
  recipient_count int not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists admin_messages_created_idx on public.admin_messages (created_at desc);

alter table public.admin_messages enable row level security;

-- Solo el admin lee/gestiona el historial de mensajes.
drop policy if exists "admin_messages_admin_all" on public.admin_messages;
create policy "admin_messages_admin_all" on public.admin_messages
  for all using (public.is_admin()) with check (public.is_admin());

-- ── RPC: enviar mensaje directo o a un grupo ────────────────────────────────
create or replace function public.admin_send_message(
  p_title text,
  p_body  text,
  p_audience text,
  p_recipient_member_no bigint default null
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_sender    uuid := auth.uid();
  v_msg       uuid;
  v_recipient uuid;
  v_count     int := 0;
  v_title     text := nullif(btrim(coalesce(p_title, '')), '');
  v_disp      text;
begin
  if not public.is_admin() then return json_build_object('ok', false, 'error', 'forbidden'); end if;
  if p_body is null or length(btrim(p_body)) = 0 then
    return json_build_object('ok', false, 'error', 'empty');
  end if;
  if p_audience not in ('all', 'consumers', 'providers', 'founders', 'direct') then
    return json_build_object('ok', false, 'error', 'bad_audience');
  end if;

  if p_audience = 'direct' then
    select id into v_recipient from public.profiles where member_no = p_recipient_member_no;
    if v_recipient is null then return json_build_object('ok', false, 'error', 'recipient_not_found'); end if;
  end if;

  v_disp := coalesce(v_title, 'Mensaje de Neuromundi');

  insert into public.admin_messages (sender_id, title, body, audience, recipient_id)
  values (v_sender, v_title, btrim(p_body), p_audience,
          case when p_audience = 'direct' then v_recipient else null end)
  returning id into v_msg;

  if p_audience = 'direct' then
    insert into public.notifications (user_id, type, title, body, data)
    values (v_recipient, 'admin_message', v_disp, btrim(p_body),
            json_build_object('message_id', v_msg, 'audience', 'direct'));
    v_count := 1;
  else
    insert into public.notifications (user_id, type, title, body, data)
    select p.id, 'admin_message', v_disp, btrim(p_body),
           json_build_object('message_id', v_msg, 'audience', p_audience)
    from public.profiles p
    where p.id <> v_sender
      and (
        p_audience = 'all'
        or (p_audience = 'consumers' and p.role in ('parent', 'patient'))
        or (p_audience = 'providers' and p.role = 'provider')
        or (p_audience = 'founders'  and p.id in (select user_id from public.founder_members))
      );
    get diagnostics v_count = row_count;
  end if;

  update public.admin_messages set recipient_count = v_count where id = v_msg;
  return json_build_object('ok', true, 'count', v_count);
end;
$$;

grant execute on function public.admin_send_message(text, text, text, bigint) to authenticated;
