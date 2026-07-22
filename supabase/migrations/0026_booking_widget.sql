-- ============================================================================
-- Widget de reserva directa (embebible en web/redes del prestador)
-- ----------------------------------------------------------------------------
-- Una página pública /reservar/NM-000123 (embebible por iframe) permite a
-- cualquier visitante enviar una SOLICITUD DE RESERVA al prestador. Se guarda en
-- booking_requests y se le notifica al prestador. Toda la escritura pasa por una
-- función SECURITY DEFINER que puede llamar incluso el público (anon). Idempotente.
-- ============================================================================

create table if not exists public.booking_requests (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  contact     text not null,
  preferred   text,
  note        text,
  status      text not null default 'new',   -- new | contacted | scheduled | dismissed
  created_at  timestamptz not null default now()
);

create index if not exists booking_requests_provider_idx on public.booking_requests (provider_id, created_at desc);

alter table public.booking_requests enable row level security;

drop policy if exists "booking_select_own" on public.booking_requests;
create policy "booking_select_own" on public.booking_requests
  for select using (auth.uid() = provider_id);

drop policy if exists "booking_update_own" on public.booking_requests;
create policy "booking_update_own" on public.booking_requests
  for update using (auth.uid() = provider_id) with check (auth.uid() = provider_id);

drop policy if exists "booking_admin_all" on public.booking_requests;
create policy "booking_admin_all" on public.booking_requests
  for all using (public.is_admin()) with check (public.is_admin());

-- Nombre público del prestador para mostrar en la página de reserva (aunque no
-- esté publicado en el directorio: él comparte su propio widget).
create or replace function public.booking_provider_name(p_member_no bigint)
returns text language sql security definer set search_path = public stable as $$
  select coalesce(business_name, full_name)
  from public.profiles
  where member_no = p_member_no and role = 'provider';
$$;
grant execute on function public.booking_provider_name(bigint) to anon, authenticated;

-- Solicitud de reserva desde el widget (la puede llamar el público / anon).
create or replace function public.request_booking(
  p_provider_member_no bigint,
  p_name text,
  p_contact text,
  p_preferred text default null,
  p_note text default null
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_provider uuid;
  v_role     text;
  v_id       uuid;
begin
  if p_name is null or length(btrim(p_name)) = 0
     or p_contact is null or length(btrim(p_contact)) = 0 then
    return json_build_object('ok', false, 'error', 'invalid');
  end if;
  select id, role into v_provider, v_role from public.profiles where member_no = p_provider_member_no;
  if v_provider is null or v_role is distinct from 'provider' then
    return json_build_object('ok', false, 'error', 'provider_not_found');
  end if;

  insert into public.booking_requests (provider_id, name, contact, preferred, note)
  values (v_provider, btrim(p_name), btrim(p_contact),
          nullif(btrim(coalesce(p_preferred, '')), ''),
          nullif(btrim(coalesce(p_note, '')), ''))
  returning id into v_id;

  insert into public.notifications (user_id, type, title, body, data)
  values (v_provider, 'booking_request', 'Nueva solicitud de reserva',
    btrim(p_name) || ' quiere agendar contigo.',
    json_build_object('booking_id', v_id, 'name', btrim(p_name),
                      'contact', btrim(p_contact), 'preferred', p_preferred));

  return json_build_object('ok', true);
end;
$$;
grant execute on function public.request_booking(bigint, text, text, text, text) to anon, authenticated;
