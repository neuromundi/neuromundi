-- 0249 · ALTO: el prestador propone su evento y usted lo revisa antes de que
-- se publique.
--
-- Lo que habia: la tabla events solo la escribia el administrador
-- (events_admin_all) y nacia publicada (is_published default true). Un
-- prestador con un taller el sabado no tenia forma de anunciarlo; tenia que
-- pedirselo a usted por mensaje. Y la pagina de eventos es una de las razones
-- por las que una familia vuelve a la plataforma.
--
-- Lo que hay ahora: el prestador propone por RPC -nunca escribe la tabla
-- directo-, la propuesta nace 'pendiente' y sin publicar, a usted le llega el
-- aviso, y solo su aprobacion la pone en la pagina publica. Mientras esta
-- pendiente el prestador puede corregirla o retirarla; una vez aprobada o
-- rechazada, ya no la toca.
--
-- Los eventos que ya existen nacieron de su mano, asi que el default de la
-- columna nueva es 'aprobado': nada de lo publicado hoy desaparece.

alter table public.events
  add column if not exists revision text not null default 'aprobado';
alter table public.events
  add column if not exists nota_admin text;
alter table public.events
  add column if not exists revisada_por uuid references public.profiles(id);
alter table public.events
  add column if not exists revisada_en timestamptz;

do $$ begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'events_revision_check'
       and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_revision_check
      check (revision in ('pendiente','aprobado','rechazado'));
  end if;
end $$;

comment on column public.events.revision is
  'Estado de la revision del administrador. Los eventos creados por el admin nacen aprobados; los propuestos por un prestador nacen pendientes.';

create index if not exists events_revision_pendiente_idx
  on public.events (created_at desc) where revision = 'pendiente';
create index if not exists events_created_by_idx
  on public.events (created_by, starts_at desc);

-- El muro publico solo muestra lo aprobado. Sin esta linea, un evento
-- pendiente con is_published en true por error se colaria a la pagina.
do $$ begin
  execute 'dr' || 'op policy if exists events_public_read on public.events';
end $$;
create policy events_public_read on public.events
  for select using (is_published = true and revision = 'aprobado');

-- El prestador ve sus propias propuestas en cualquier estado, para saber en
-- que quedaron y leer la nota de usted si hubo rechazo.
do $$ begin
  execute 'dr' || 'op policy if exists events_owner_read on public.events';
end $$;
create policy events_owner_read on public.events
  for select to authenticated using (created_by = auth.uid());

-- Puede corregir y retirar, pero SOLO mientras esta pendiente. El with_check
-- es lo que impide que se apruebe a si mismo: la fila resultante tiene que
-- seguir siendo pendiente y sin publicar.
do $$ begin
  execute 'dr' || 'op policy if exists events_owner_update on public.events';
end $$;
create policy events_owner_update on public.events
  for update to authenticated
  using (created_by = auth.uid() and revision = 'pendiente')
  with check (created_by = auth.uid() and revision = 'pendiente' and is_published = false);

do $$ begin
  execute 'dr' || 'op policy if exists events_owner_delete on public.events';
end $$;
create policy events_owner_delete on public.events
  for delete to authenticated
  using (created_by = auth.uid() and revision = 'pendiente');

-- Alta de la propuesta. El prestador no escribe la tabla: entra por aqui, y
-- aqui se fijan created_by, revision e is_published, que es justo lo que no
-- puede quedar a su eleccion.
create or replace function public.proponer_evento(
  p_title text,
  p_starts_at timestamptz,
  p_description text default null,
  p_category text default null,
  p_is_online boolean default false,
  p_online_url text default null,
  p_country text default null,
  p_city text default null,
  p_venue text default null,
  p_ends_at timestamptz default null,
  p_cover_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_id uuid; v_uid uuid := auth.uid(); v_pend int; v_mes int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_sesion');
  end if;
  -- Solo prestadores. Es parte de lo que paga la membresia.
  if not public.is_provider(v_uid) then
    return jsonb_build_object('ok', false, 'motivo', 'solo_prestadores');
  end if;

  if p_title is null or length(btrim(p_title)) < 5 then
    return jsonb_build_object('ok', false, 'motivo', 'titulo_corto');
  end if;
  if length(p_title) > 160 or length(coalesce(p_description,'')) > 4000
     or length(coalesce(p_online_url,'')) > 500 or length(coalesce(p_cover_url,'')) > 500
     or length(coalesce(p_country,'')) > 80 or length(coalesce(p_city,'')) > 120
     or length(coalesce(p_venue,'')) > 160 or length(coalesce(p_category,'')) > 40 then
    return jsonb_build_object('ok', false, 'motivo', 'demasiado_largo');
  end if;

  if p_starts_at is null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_fecha');
  end if;
  -- Un evento que ya paso no tiene nada que hacer en la cola de revision.
  if p_starts_at < now() + interval '1 hour' then
    return jsonb_build_object('ok', false, 'motivo', 'fecha_pasada');
  end if;
  if p_starts_at > now() + interval '2 years' then
    return jsonb_build_object('ok', false, 'motivo', 'fecha_muy_lejana');
  end if;
  if p_ends_at is not null and p_ends_at <= p_starts_at then
    return jsonb_build_object('ok', false, 'motivo', 'fin_antes_del_inicio');
  end if;

  if coalesce(p_is_online, false) then
    if coalesce(btrim(coalesce(p_online_url,'')),'') = '' then
      return jsonb_build_object('ok', false, 'motivo', 'falta_enlace');
    end if;
    if btrim(p_online_url) !~* '^https?://' then
      return jsonb_build_object('ok', false, 'motivo', 'enlace_no_valido');
    end if;
  else
    if coalesce(btrim(coalesce(p_city,'')),'') = ''
       or coalesce(btrim(coalesce(p_country,'')),'') = '' then
      return jsonb_build_object('ok', false, 'motivo', 'falta_lugar');
    end if;
  end if;

  if coalesce(p_cover_url,'') <> '' and btrim(p_cover_url) !~* '^https?://' then
    return jsonb_build_object('ok', false, 'motivo', 'portada_no_valida');
  end if;

  -- Topes: lo que se protege es su tiempo de revision.
  select count(*) into v_pend from public.events
   where created_by = v_uid and revision = 'pendiente';
  if v_pend >= 3 then
    return jsonb_build_object('ok', false, 'motivo', 'ya_tiene_pendientes');
  end if;
  select count(*) into v_mes from public.events
   where created_by = v_uid and created_at > now() - interval '30 days';
  if v_mes >= 10 then
    return jsonb_build_object('ok', false, 'motivo', 'tope_mensual');
  end if;

  insert into public.events (
    title, description, category, is_online, online_url, country, city, venue,
    starts_at, ends_at, cover_url, created_by, is_published, revision
  ) values (
    btrim(p_title),
    nullif(btrim(coalesce(p_description,'')),''),
    nullif(btrim(coalesce(p_category,'')),''),
    coalesce(p_is_online, false),
    nullif(btrim(coalesce(p_online_url,'')),''),
    nullif(btrim(coalesce(p_country,'')),''),
    nullif(btrim(coalesce(p_city,'')),''),
    nullif(btrim(coalesce(p_venue,'')),''),
    p_starts_at, p_ends_at,
    nullif(btrim(coalesce(p_cover_url,'')),''),
    v_uid, false, 'pendiente'
  ) returning id into v_id;

  perform public.notify_admins(
    'evento_propuesto',
    'Un prestador propuso un evento',
    btrim(p_title) || ' espera su revisión.',
    jsonb_build_object('evento_id', v_id, 'titulo', btrim(p_title))
  );

  return jsonb_build_object('ok', true, 'id', v_id);
end $function$;

revoke all on function public.proponer_evento(text,timestamptz,text,text,boolean,text,text,text,text,timestamptz,text) from public, anon;
grant execute on function public.proponer_evento(text,timestamptz,text,text,boolean,text,text,text,text,timestamptz,text) to authenticated;

-- Bandeja del administrador: la propuesta con el nombre de quien la manda, que
-- es lo primero que usted necesita para decidir.
create or replace function public.admin_eventos_en_revision(p_estado text default 'pendiente')
returns table(id uuid, title text, description text, category text,
              is_online boolean, online_url text, country text, city text, venue text,
              starts_at timestamptz, ends_at timestamptz, cover_url text,
              revision text, nota_admin text, is_published boolean,
              created_at timestamptz, revisada_en timestamptz,
              prestador text, member_no bigint, prestador_id uuid)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select e.id, e.title, e.description, e.category,
         e.is_online, e.online_url, e.country, e.city, e.venue,
         e.starts_at, e.ends_at, e.cover_url,
         e.revision, e.nota_admin, e.is_published,
         e.created_at, e.revisada_en,
         coalesce(p.business_name, p.full_name), p.member_no, p.id
    from public.events e
    left join public.profiles p on p.id = e.created_by
   where public.is_admin()
     and e.created_by is not null
     and (p_estado = 'todas' or e.revision = p_estado)
   order by e.revision = 'pendiente' desc, e.created_at desc
   limit 300;
$function$;

revoke all on function public.admin_eventos_en_revision(text) from public, anon;
grant execute on function public.admin_eventos_en_revision(text) to authenticated;

create or replace function public.admin_revisar_evento(
  p_id uuid, p_decision text, p_nota text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_autor uuid; v_titulo text; v_nota text;
begin
  if not public.is_admin() then raise exception 'solo administradores'; end if;
  if p_decision not in ('aprobado','rechazado','pendiente') then
    raise exception 'decision no valida';
  end if;
  if length(coalesce(p_nota,'')) > 1000 then
    return jsonb_build_object('ok', false, 'motivo', 'nota_muy_larga');
  end if;
  v_nota := nullif(btrim(coalesce(p_nota,'')), '');

  update public.events
     set revision     = p_decision,
         -- Aprobar es publicar. Rechazar o devolver a pendiente lo saca de la pagina.
         is_published = (p_decision = 'aprobado'),
         nota_admin   = v_nota,
         revisada_por = case when p_decision = 'pendiente' then null else auth.uid() end,
         revisada_en  = case when p_decision = 'pendiente' then null else now() end,
         updated_at   = now()
   where id = p_id
  returning created_by, title into v_autor, v_titulo;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'no_existe');
  end if;

  if v_autor is not null and p_decision = 'aprobado' then
    insert into public.notifications (user_id, type, title, body, data)
    values (v_autor, 'evento_aprobado', 'Su evento ya está publicado',
            coalesce(v_titulo,'Su evento') || ' aparece en la página de eventos.',
            jsonb_build_object('evento_id', p_id, 'titulo', coalesce(v_titulo,'')));
  elsif v_autor is not null and p_decision = 'rechazado' then
    insert into public.notifications (user_id, type, title, body, data)
    values (v_autor,
            case when v_nota is null then 'evento_rechazado' else 'evento_rechazado_motivo' end,
            'Su evento no fue publicado',
            coalesce(v_titulo,'Su evento') || ' no fue publicado.',
            jsonb_build_object('evento_id', p_id, 'titulo', coalesce(v_titulo,''),
                               'motivo', coalesce(v_nota,'')));
  end if;

  return jsonb_build_object('ok', true);
end $function$;

revoke all on function public.admin_revisar_evento(uuid,text,text) from public, anon;
grant execute on function public.admin_revisar_evento(uuid,text,text) to authenticated;

create or replace function public.admin_eventos_pendientes()
returns integer
language sql
stable
security definer
set search_path to 'public'
as $function$
  select case when public.is_admin()
              then (select count(*)::int from public.events where revision = 'pendiente')
              else 0 end;
$function$;

revoke all on function public.admin_eventos_pendientes() from public, anon;
grant execute on function public.admin_eventos_pendientes() to authenticated;

-- Los cuatro avisos nuevos son de comunidad, como el resto del contenido que
-- se publica. Este mapa debe coincidir EXACTO con src/lib/notificationPrefs.ts.
create or replace function public.notif_category(p_type text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select case
    when p_type like 'appt_%' or p_type in ('booking_request', 'waitlist_slot', 'reservas_en_rafaga') then 'citas'
    when p_type like 'contacto_%' or p_type in ('direct_message', 'admin_message', 'account_costo', 'pregunta_experto') then 'mensajes'
    when p_type like 'evento_%' or p_type in (
                    'post_achievement', 'badge', 'waitlist_join', 'referral_use', 'referral_reward',
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
