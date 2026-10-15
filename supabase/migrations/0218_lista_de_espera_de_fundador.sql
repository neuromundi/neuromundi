-- 0218 — Solicitud de cuota de fundador cuando ya no alcanzo el cupo.
--
-- EL PROBLEMA QUE RESUELVE. El cupo de fundador se agota por pais y por tipo,
-- y el plazo tiene fecha fija. Alguien invitado expresamente a la cuota de
-- fundador puede quedarse fuera por dias, o por minutos, y lo unico que ve es
-- el precio ordinario, al doble, sin explicacion ni salida. Es la peor
-- primera impresion posible para justo el perfil que mas interesa.
--
-- COMO QUEDA. El interesado puede SOLICITAR la cuota de fundador aunque ya no
-- haya lugar. La solicitud no concede nada: queda registrada y el admin la
-- resuelve a mano desde el panel. Si la concede, a esa persona se le autoriza
-- individualmente, sin tocar el cupo general ni abrir la puerta a nadie mas.
--
-- POR QUE AUTORIZACION INDIVIDUAL Y NO SUBIR EL CUPO DEL PAIS. Subir el cupo
-- abre un lugar que puede tomar cualquiera: el siguiente en pagar, no la
-- persona a quien se le quiso conceder. La autorizacion individual va dirigida
-- y es auditable. Si de todas formas se quiere ampliar el cupo general, eso ya
-- se hace desde campaign_config.founder_caps_by_country.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. La autorizacion individual
-- ─────────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists fundador_autorizado boolean not null default false,
  add column if not exists fundador_autorizado_en timestamptz,
  add column if not exists fundador_autorizado_por uuid references public.profiles(id);

comment on column public.profiles.fundador_autorizado is
  'Autorizacion individual del admin para la cuota de fundador pese a cupo agotado o plazo vencido. Columna protegida: nadie se la puede poner a si mismo.';

-- ─────────────────────────────────────────────────────────────────────────
-- 2. El libro de solicitudes
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.founder_requests (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  country       text,
  kind          text,
  nota_usuario  text,
  status        text not null default 'pendiente'
                check (status in ('pendiente','aprobada','rechazada')),
  solicitada_en timestamptz not null default now(),
  resuelta_en   timestamptz,
  resuelta_por  uuid references public.profiles(id),
  nota_admin    text
);

alter table public.founder_requests enable row level security;

-- Cada quien ve su propia solicitud; el admin las ve todas. Escribir solo por
-- las funciones de abajo, nunca directo.
drop policy if exists founder_requests_lectura on public.founder_requests;
create policy founder_requests_lectura on public.founder_requests
  for select using (user_id = auth.uid() or public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- 3. La autorizacion individual vence el cupo y el plazo
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.founder_eligible(p_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare v_kind text; v_country text; v_wants boolean; v_usados int; v_limite timestamptz; v_auth boolean;
begin
  if exists (select 1 from public.founder_members where user_id = p_id) then return true; end if;
  select p.country, p.wants_founder, coalesce(p.fundador_autorizado, false)
    into v_country, v_wants, v_auth
  from public.profiles p where p.id = p_id;
  -- Autorizacion individual del admin: pasa por encima de cupo y plazo. Es
  -- justo lo que se le concedio, y solo a esta persona.
  if coalesce(v_auth, false) then return true; end if;
  if v_wants is false then return false; end if;
  v_kind := public.founder_kind_for(p_id);
  if v_kind is null then return false; end if;
  if coalesce(v_country,'') = '' then return false; end if;
  select (value #>> '{}')::timestamptz into v_limite
  from public.campaign_config c, jsonb_each(c.founder_deadline_by_country)
  where c.id = 1 and key = v_country;
  if v_limite is not null and now() >= v_limite then return false; end if;
  select count(*) into v_usados
  from public.founder_members fm join public.profiles p on p.id = fm.user_id
  where fm.kind = v_kind and coalesce(p.is_internal,false) = false and p.country = v_country;
  return v_usados < public.founder_cap_for(v_country, v_kind);
end;
$fn$;

-- Y el asiento se concede aunque el cupo este lleno, si hay autorizacion.
create or replace function public.grant_founder_seat(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
declare v_kind text; v_country text; v_usados int; v_auth boolean;
begin
  if exists (select 1 from public.founder_members where user_id = p_id) then return true; end if;
  if not public.founder_eligible(p_id) then return false; end if;
  v_kind := public.founder_kind_for(p_id);
  if v_kind is null then return false; end if;
  select p.country, coalesce(p.fundador_autorizado, false)
    into v_country, v_auth from public.profiles p where p.id = p_id;
  -- Sin autorizacion individual, el tope del pais manda.
  if not coalesce(v_auth, false) then
    select count(*) into v_usados
    from public.founder_members fm join public.profiles p on p.id = fm.user_id
    where fm.kind = v_kind and coalesce(p.is_internal,false) = false and p.country = v_country;
    if v_usados >= public.founder_cap_for(v_country, v_kind) then return false; end if;
  end if;
  insert into public.founder_members (user_id, kind, country, grace_until)
  values (p_id, v_kind, v_country, null) on conflict (user_id) do nothing;
  return true;
end;
$fn$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. El interesado solicita
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.solicitar_cuota_fundador(p_nota text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare v_me uuid := auth.uid(); v_country text; v_kind text; v_tipo text;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'motivo', 'sin_sesion'); end if;
  if exists (select 1 from public.founder_members where user_id = v_me) then
    return jsonb_build_object('ok', false, 'motivo', 'ya_es_fundador');
  end if;
  if public.founder_eligible(v_me) then
    return jsonb_build_object('ok', false, 'motivo', 'todavia_hay_cupo');
  end if;
  select p.country into v_country from public.profiles p where p.id = v_me;
  v_kind := public.founder_kind_for(v_me);
  v_tipo := public.affiliate_type_for(v_me);

  insert into public.founder_requests (user_id, country, kind, nota_usuario)
  values (v_me, v_country, v_kind, nullif(btrim(coalesce(p_nota, '')), ''))
  on conflict (user_id) do update
    set nota_usuario  = excluded.nota_usuario,
        solicitada_en = now(),
        status        = case when public.founder_requests.status = 'aprobada'
                             then 'aprobada' else 'pendiente' end;

  perform public.notify_admins(
    'founder_request',
    'Solicitud de cuota de fundador',
    'Alguien pide la cuota de fundador fuera de cupo o de plazo. Resuelvase en el panel.',
    jsonb_build_object('user_id', v_me, 'country', v_country, 'kind', v_kind, 'affiliate_type', v_tipo)
  );
  return jsonb_build_object('ok', true, 'country', v_country, 'kind', v_kind);
end;
$fn$;

-- Estado de la solicitud propia, para que la pantalla sepa que enseñar.
create or replace function public.mi_solicitud_fundador()
returns jsonb
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce(
    (select jsonb_build_object('status', r.status, 'solicitada_en', r.solicitada_en,
                               'resuelta_en', r.resuelta_en, 'nota_admin', r.nota_admin)
       from public.founder_requests r where r.user_id = auth.uid()),
    jsonb_build_object('status', 'ninguna'));
$fn$;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. El admin resuelve
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.admin_solicitudes_fundador(p_status text default 'pendiente')
returns table (
  user_id uuid, nombre text, correo text, pais text, kind text, affiliate_type text,
  nota_usuario text, status text, solicitada_en timestamptz, nota_admin text,
  usados int, cupo int
)
language plpgsql
stable
security definer
set search_path = public
as $fn$
begin
  if not public.is_admin() then raise exception 'solo administradores'; end if;
  return query
  select r.user_id,
         coalesce(nullif(p.business_name,''), p.full_name) as nombre,
         u.email::text,
         r.country, r.kind, public.affiliate_type_for(r.user_id),
         r.nota_usuario, r.status, r.solicitada_en, r.nota_admin,
         (select count(*)::int from public.founder_members fm
            join public.profiles p2 on p2.id = fm.user_id
           where fm.kind = r.kind and coalesce(p2.is_internal,false) = false
             and p2.country = r.country),
         public.founder_cap_for(r.country, r.kind)
  from public.founder_requests r
  join public.profiles p on p.id = r.user_id
  left join auth.users u on u.id = r.user_id
  where p_status = 'todas' or r.status = p_status
  order by r.solicitada_en;
end;
$fn$;

create or replace function public.admin_resolver_solicitud_fundador(
  p_user uuid, p_conceder boolean, p_nota text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare v_me uuid := auth.uid();
begin
  if not public.is_admin() then raise exception 'solo administradores'; end if;
  if not exists (select 1 from public.founder_requests where user_id = p_user) then
    return jsonb_build_object('ok', false, 'motivo', 'sin_solicitud');
  end if;

  update public.founder_requests
     set status = case when p_conceder then 'aprobada' else 'rechazada' end,
         resuelta_en = now(), resuelta_por = v_me,
         nota_admin = nullif(btrim(coalesce(p_nota, '')), '')
   where user_id = p_user;

  if p_conceder then
    update public.profiles
       set fundador_autorizado = true,
           fundador_autorizado_en = now(),
           fundador_autorizado_por = v_me
     where id = p_user;
    -- Si ya tiene la cuota cubierta, el asiento se le da aqui mismo; si aun no
    -- ha pagado, se lo dara el webhook al cobrarse, como a cualquiera.
    if public.cuota_cubierta(p_user) then
      perform public.grant_founder_seat(p_user);
    end if;
    insert into public.notifications (user_id, type, title, body, data)
    values (p_user, 'founder_request_approved', 'Su cuota de Miembro Fundador fue autorizada',
            'Le reservamos la cuota de Miembro Fundador. Ya puede contratarla al precio de fundador.',
            jsonb_build_object('nota', p_nota));
  else
    update public.profiles set fundador_autorizado = false where id = p_user;
  end if;

  return jsonb_build_object('ok', true, 'concedida', p_conceder);
end;
$fn$;

revoke all on function public.admin_solicitudes_fundador(text) from public, anon;
revoke all on function public.admin_resolver_solicitud_fundador(uuid, boolean, text) from public, anon;
grant execute on function public.admin_solicitudes_fundador(text) to authenticated;
grant execute on function public.admin_resolver_solicitud_fundador(uuid, boolean, text) to authenticated;
grant execute on function public.solicitar_cuota_fundador(text) to authenticated;
grant execute on function public.mi_solicitud_fundador() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. La autorizacion es columna PROTEGIDA
--
-- Sin esto, cualquier usuario se pondria fundador_autorizado = true en su
-- propio perfil con una sola peticion y se concederia la cuota de fundador
-- el mismo. Seria exactamente el agujero que cerro la migracion 0215, abierto
-- otra vez por la puerta de al lado. Se reemite protect_profile_columns con
-- las tres columnas nuevas añadidas a la lista.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare is_adm boolean; v_uid uuid; v_libre boolean;
begin
  v_uid := auth.uid();
  if v_uid is null then return new; end if;

  select (role = 'admin') into is_adm from public.profiles where id = v_uid;
  if coalesce(is_adm, false) then return new; end if;

  v_libre := coalesce(current_setting('app.perfil_privilegiado', true), '') = '1';

  new.role := old.role;
  new.rules_version_accepted := old.rules_version_accepted;
  new.is_verified := old.is_verified;
  new.is_advisor  := old.is_advisor;

  if not v_libre then
    new.sector                 := old.sector;
    new.membership_status      := old.membership_status;
    new.membership_due_at      := old.membership_due_at;
    new.membership_paid_until  := old.membership_paid_until;
    new.stripe_customer_id     := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.promo_code_used        := old.promo_code_used;
    new.referral_credit_pct    := old.referral_credit_pct;
    new.referred_by            := old.referred_by;
    new.referred_at            := old.referred_at;
    -- autorizacion individual de fundador: la concede el admin, nadie mas
    new.fundador_autorizado     := old.fundador_autorizado;
    new.fundador_autorizado_en  := old.fundador_autorizado_en;
    new.fundador_autorizado_por := old.fundador_autorizado_por;
    new.exencion_tipo          := old.exencion_tipo;
    new.exencion_folio         := old.exencion_folio;
    new.exencion_documento     := old.exencion_documento;
    new.exencion_solicitada_en := old.exencion_solicitada_en;
    new.exencion_aprobada_en   := old.exencion_aprobada_en;
    new.exencion_aprobada_por  := old.exencion_aprobada_por;
    new.exencion_vigente_hasta := old.exencion_vigente_hasta;
    new.exencion_rechazo       := old.exencion_rechazo;
    new.suspended_at           := old.suspended_at;
    new.suspend_until          := old.suspend_until;
    new.winback_until          := old.winback_until;
    new.pre_suspend_published  := old.pre_suspend_published;
  end if;

  return new;
end;
$fn$;
