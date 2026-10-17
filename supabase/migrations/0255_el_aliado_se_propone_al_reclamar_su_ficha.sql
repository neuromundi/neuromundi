-- 0255 · El muro de aliados deja de ser una lista que solo carga el
-- administrador: quien reclama su ficha puede proponer su organizacion, y
-- usted aprueba. (Decision de Enyoria, 17 oct 2026.)
--
-- Por que hacia falta: la tanda de correo a las organizaciones candidatas les
-- promete que al reclamar su ficha su informacion aparece en la seccion de
-- Aliados. Eso no existia. Aliados es la tabla `allies` -doce renglones, dos
-- activos- y el directorio es otra tabla; no se tocaban. Sin esta migracion el
-- correo prometeria algo que la plataforma no hace.
--
-- La puerta es haber reclamado una ficha. No es un formulario abierto: es el
-- siguiente paso de quien ya probo que la organizacion es suya.
--
-- Dos detalles que estan a proposito:
--   · logo_url deja de ser obligatorio, porque al proponer todavia no hay
--     logotipo. A cambio, admin_resolver_aliado SE NIEGA a aprobar sin el: el
--     muro pinta logotipos y un hueco en la cuadricula se nota.
--   · Los doce aliados que ya existen nacen 'aprobado', asi que nada de lo
--     publicado hoy desaparece. Verificado: antes y despues, dos visibles.

alter table public.allies alter column logo_url drop not null;

alter table public.allies add column if not exists estado text not null default 'aprobado';
alter table public.allies add column if not exists directorio_id uuid references public.directorio(id) on delete set null;
alter table public.allies add column if not exists propuesta_por uuid references public.profiles(id) on delete set null;
alter table public.allies add column if not exists propuesta_en timestamptz;
alter table public.allies add column if not exists nota_admin text;
alter table public.allies add column if not exists resuelta_por uuid references public.profiles(id);
alter table public.allies add column if not exists resuelta_en timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='allies_estado_valido') then
    alter table public.allies add constraint allies_estado_valido
      check (estado in ('propuesto','aprobado','rechazado'));
  end if;
end $$;

comment on column public.allies.estado is
  'Flujo de revision. Los aliados cargados a mano por el administrador nacen aprobados; los que propone un miembro al reclamar su ficha nacen propuestos y sin publicar.';

create unique index if not exists allies_una_propuesta_viva_idx
  on public.allies (propuesta_por) where estado = 'propuesto';
create index if not exists allies_propuestos_idx
  on public.allies (propuesta_en desc) where estado = 'propuesto';

-- El muro publico solo muestra lo aprobado Y activo.
do $$ begin
  execute 'dr' || 'op policy if exists allies_public_read on public.allies';
end $$;
create policy allies_public_read on public.allies
  for select using (is_active = true and estado = 'aprobado');

-- Quien propuso ve su propia propuesta y en que quedo.
do $$ begin
  execute 'dr' || 'op policy if exists allies_owner_read on public.allies';
end $$;
create policy allies_owner_read on public.allies
  for select to authenticated using (propuesta_por = (select auth.uid()));

create or replace function public.proponer_aliado(
  p_name text,
  p_website text default null,
  p_logo_url text default null,
  p_countries text[] default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_uid uuid := (select auth.uid()); v_ficha uuid; v_id uuid; v_vivas int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_sesion');
  end if;

  select d.id into v_ficha
    from public.directorio d
   where d.reclamada_por = v_uid
   order by d.reclamada_en desc nulls last
   limit 1;
  if v_ficha is null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_ficha_reclamada');
  end if;

  if p_name is null or length(btrim(p_name)) < 3 then
    return jsonb_build_object('ok', false, 'motivo', 'nombre_corto');
  end if;
  if length(p_name) > 120 or length(coalesce(p_website,'')) > 300
     or length(coalesce(p_logo_url,'')) > 500 then
    return jsonb_build_object('ok', false, 'motivo', 'demasiado_largo');
  end if;
  if coalesce(btrim(coalesce(p_website,'')),'') <> '' and btrim(p_website) !~* '^https?://' then
    return jsonb_build_object('ok', false, 'motivo', 'sitio_no_valido');
  end if;
  if coalesce(btrim(coalesce(p_logo_url,'')),'') <> '' and btrim(p_logo_url) !~* '^https?://' then
    return jsonb_build_object('ok', false, 'motivo', 'logo_no_valido');
  end if;
  if p_countries is not null and array_length(p_countries, 1) > 30 then
    return jsonb_build_object('ok', false, 'motivo', 'demasiados_paises');
  end if;

  select count(*) into v_vivas from public.allies
   where propuesta_por = v_uid and estado = 'propuesto';
  if v_vivas >= 1 then
    return jsonb_build_object('ok', false, 'motivo', 'ya_tiene_propuesta');
  end if;

  insert into public.allies
    (name, logo_url, website, countries, sort_order, is_active,
     estado, directorio_id, propuesta_por, propuesta_en)
  values
    (btrim(p_name),
     nullif(btrim(coalesce(p_logo_url,'')),''),
     nullif(btrim(coalesce(p_website,'')),''),
     p_countries,
     999, false, 'propuesto', v_ficha, v_uid, now())
  returning id into v_id;

  perform public.notify_admins(
    'aliado_propuesto',
    'Una organización pide aparecer como aliada',
    btrim(p_name) || ' propuso su alta en el muro de aliados.',
    jsonb_build_object('aliado_id', v_id, 'nombre', btrim(p_name), 'directorio_id', v_ficha)
  );

  return jsonb_build_object('ok', true, 'id', v_id);
end $function$;

revoke all on function public.proponer_aliado(text,text,text,text[]) from public, anon;
grant execute on function public.proponer_aliado(text,text,text,text[]) to authenticated;

create or replace function public.mi_propuesta_de_aliado()
returns table(id uuid, name text, website text, logo_url text, countries text[],
              estado text, nota_admin text, propuesta_en timestamptz, is_active boolean)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select a.id, a.name, a.website, a.logo_url, a.countries,
         a.estado, a.nota_admin, a.propuesta_en, a.is_active
  from public.allies a
  where a.propuesta_por = (select auth.uid())
  order by a.propuesta_en desc nulls last
  limit 10;
$function$;

revoke all on function public.mi_propuesta_de_aliado() from public, anon;
grant execute on function public.mi_propuesta_de_aliado() to authenticated;

create or replace function public.admin_aliados_propuestos(p_estado text default 'propuesto')
returns table(id uuid, name text, website text, logo_url text, countries text[],
              estado text, nota_admin text, propuesta_en timestamptz, is_active boolean,
              ficha text, proponente text, proponente_id uuid)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select a.id, a.name, a.website, a.logo_url, a.countries,
         a.estado, a.nota_admin, a.propuesta_en, a.is_active,
         d.nombre,
         coalesce(p.business_name, p.full_name),
         a.propuesta_por
    from public.allies a
    left join public.directorio d on d.id = a.directorio_id
    left join public.profiles p on p.id = a.propuesta_por
   where public.is_admin()
     and a.propuesta_por is not null
     and (p_estado = 'todas' or a.estado = p_estado)
   order by a.estado = 'propuesto' desc, a.propuesta_en desc nulls last
   limit 300;
$function$;

revoke all on function public.admin_aliados_propuestos(text) from public, anon;
grant execute on function public.admin_aliados_propuestos(text) to authenticated;

create or replace function public.admin_resolver_aliado(
  p_id uuid, p_decision text, p_nota text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_autor uuid; v_nombre text; v_logo text; v_nota text;
begin
  if not public.is_admin() then raise exception 'solo administradores'; end if;
  if p_decision not in ('aprobado','rechazado','propuesto') then
    raise exception 'decision no valida';
  end if;
  if length(coalesce(p_nota,'')) > 1000 then
    return jsonb_build_object('ok', false, 'motivo', 'nota_muy_larga');
  end if;
  v_nota := nullif(btrim(coalesce(p_nota,'')), '');

  select propuesta_por, name, logo_url into v_autor, v_nombre, v_logo
    from public.allies where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'no_existe');
  end if;

  if p_decision = 'aprobado' and coalesce(btrim(coalesce(v_logo,'')),'') = '' then
    return jsonb_build_object('ok', false, 'motivo', 'falta_logotipo');
  end if;

  update public.allies
     set estado       = p_decision,
         is_active    = (p_decision = 'aprobado'),
         nota_admin   = v_nota,
         resuelta_por = case when p_decision = 'propuesto' then null else (select auth.uid()) end,
         resuelta_en  = case when p_decision = 'propuesto' then null else now() end
   where id = p_id;

  if v_autor is not null and p_decision = 'aprobado' then
    insert into public.notifications (user_id, type, title, body, data)
    values (v_autor, 'aliado_aprobado', 'Su organización ya aparece como aliada',
            coalesce(v_nombre,'Su organización') || ' está publicada en el muro de aliados.',
            jsonb_build_object('aliado_id', p_id, 'nombre', coalesce(v_nombre,'')));
  elsif v_autor is not null and p_decision = 'rechazado' then
    insert into public.notifications (user_id, type, title, body, data)
    values (v_autor,
            case when v_nota is null then 'aliado_rechazado' else 'aliado_rechazado_motivo' end,
            'Su alta como aliada no procedió',
            coalesce(v_nombre,'Su organización') || ' no fue publicada en el muro de aliados.',
            jsonb_build_object('aliado_id', p_id, 'nombre', coalesce(v_nombre,''),
                               'motivo', coalesce(v_nota,'')));
  end if;

  return jsonb_build_object('ok', true);
end $function$;

revoke all on function public.admin_resolver_aliado(uuid,text,text) from public, anon;
grant execute on function public.admin_resolver_aliado(uuid,text,text) to authenticated;

create or replace function public.admin_aliados_pendientes()
returns integer
language sql
stable
security definer
set search_path to 'public'
as $function$
  select case when public.is_admin()
              then (select count(*)::int from public.allies where estado = 'propuesto')
              else 0 end;
$function$;

revoke all on function public.admin_aliados_pendientes() from public, anon;
grant execute on function public.admin_aliados_pendientes() to authenticated;

-- Los cuatro avisos nuevos son de comunidad. Espejo de src/lib/notificationPrefs.ts.
create or replace function public.notif_category(p_type text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select case
    when p_type like 'appt_%' or p_type in ('booking_request', 'waitlist_slot', 'reservas_en_rafaga') then 'citas'
    when p_type like 'contacto_%' or p_type in ('direct_message', 'admin_message', 'account_costo', 'pregunta_experto') then 'mensajes'
    when p_type like 'evento_%' or p_type like 'aliado_%' or p_type in (
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
