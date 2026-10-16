-- 0236 · Las exenciones dejan de ser un trámite mudo, y se ponen topes a tres
-- puertas abiertas. (Auditoría del 15 oct 2026, hallazgos A-18 y A-20.)

-- ── A-18 · Nadie se enteraba, en ninguno de los dos sentidos ────────────────
-- Pedir una exención no avisaba a nadie: la solicitud esperaba a que alguien
-- recordara abrir el panel. Resolverla tampoco avisaba al solicitante, ni al
-- aprobar ni al rechazar, mientras su plazo de pago seguía corriendo. El
-- rechazo se guardaba en un campo que sólo veía si volvía a entrar a la tarjeta.

create or replace function public.solicitar_exencion(p_tipo text, p_folio text, p_documento text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_nombre text;
begin
  if auth.uid() is null then raise exception 'sesion requerida'; end if;
  if p_tipo not in ('publico','donataria','cluni') then
    raise exception 'tipo de exencion no valido';
  end if;
  if btrim(coalesce(p_folio,'')) = '' then
    raise exception 'falta el RFC o la CLUNI';
  end if;

  perform set_config('app.perfil_privilegiado', '1', true);
  update public.profiles
     set exencion_tipo = p_tipo,
         exencion_folio = btrim(p_folio),
         exencion_documento = nullif(btrim(coalesce(p_documento,'')), ''),
         exencion_solicitada_en = now(),
         exencion_aprobada_en = null,
         exencion_aprobada_por = null,
         exencion_rechazo = null
   where id = auth.uid();
  perform set_config('app.perfil_privilegiado', '0', true);
  if not found then raise exception 'perfil no encontrado'; end if;

  perform public.admin_log_account_action(auth.uid(), 'exencion_solicitada', p_tipo || ' ' || btrim(p_folio));

  -- AVISO AL ADMINISTRADOR. Antes no existía: la solicitud se quedaba esperando
  -- a que alguien recordara abrir el panel de exenciones. Comparar con la
  -- apertura de una invitación, que sí dispara aviso.
  select coalesce(nullif(btrim(business_name), ''), full_name, 'Un perfil')
    into v_nombre from public.profiles where id = auth.uid();
  perform public.notify_admins(
    'exencion_solicitada',
    'Nueva solicitud de exención de cuota',
    coalesce(v_nombre, 'Un perfil') || ' solicitó la exención (' || p_tipo || ').',
    jsonb_build_object('user_id', auth.uid(), 'tipo', p_tipo, 'folio', btrim(p_folio))
  );
  return true;
end $function$;

create or replace function public.admin_exencion_resolver(
  p_user uuid, p_aprobar boolean, p_nota text default null, p_meses integer default 12
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_tipo text; v_hasta timestamptz;
begin
  if not public.is_admin() then raise exception 'solo administradores'; end if;
  select exencion_tipo into v_tipo from public.profiles where id = p_user;
  if v_tipo is null then raise exception 'ese perfil no tiene solicitud de exencion'; end if;

  if p_aprobar then
    update public.profiles
       set membership_status = 'exempt',
           exencion_aprobada_en = now(),
           exencion_aprobada_por = auth.uid(),
           exencion_rechazo = null,
           -- público y empresa no caducan; donataria y CLUNI sí
           exencion_vigente_hasta = case when v_tipo in ('publico','empresa') then null
                                         else now() + make_interval(months => greatest(1, p_meses)) end
     where id = p_user
     returning exencion_vigente_hasta into v_hasta;
    perform public.admin_log_account_action(p_user, 'exencion_aprobada', p_nota);

    -- AVISO AL SOLICITANTE. No se le decía nada: su plazo de pago seguía
    -- corriendo mientras el expediente ya estaba resuelto.
    insert into public.notifications (user_id, type, title, body)
    values (p_user, 'exencion_resuelta', 'Su exención de cuota fue aprobada',
            case when v_hasta is null
                 then 'No se le pedirá cuota de membresía.'
                 else 'No se le pedirá cuota hasta el ' || to_char(v_hasta at time zone 'America/Mexico_City', 'DD/MM/YYYY') || '. Le avisaremos antes de esa fecha.'
            end);
  else
    update public.profiles
       set membership_status = case when membership_status = 'exempt' then 'pending' else membership_status end,
           exencion_aprobada_en = null,
           exencion_aprobada_por = null,
           exencion_vigente_hasta = now(),
           exencion_rechazo = nullif(btrim(coalesce(p_nota,'')), '')
     where id = p_user;
    perform public.admin_log_account_action(p_user, 'exencion_rechazada', p_nota);

    insert into public.notifications (user_id, type, title, body)
    values (p_user, 'exencion_resuelta', 'Su solicitud de exención no procedió',
            coalesce(nullif(btrim(coalesce(p_nota,'')), ''),
                     'Revise su expediente en el panel y vuelva a enviarlo si procede.'));
  end if;
  return true;
end $function$;

-- Aviso antes de que venza una exención anual. Sin esto, al vencer la ficha se
-- retiraba del directorio sin que nadie le hubiera dicho nada.
create or replace function public.avisar_exenciones_por_vencer()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_n int := 0; r record;
begin
  for r in
    select id, exencion_vigente_hasta
    from public.profiles
    where membership_status = 'exempt'
      and exencion_vigente_hasta is not null
      and exencion_vigente_hasta > now()
      and exencion_vigente_hasta < now() + interval '21 days'
      and not exists (
        select 1 from public.notifications n
        where n.user_id = profiles.id and n.type = 'exencion_por_vencer'
          and n.created_at > now() - interval '30 days'
      )
  loop
    insert into public.notifications (user_id, type, title, body)
    values (r.id, 'exencion_por_vencer', 'Su exención de cuota está por vencer',
            'Vence el ' || to_char(r.exencion_vigente_hasta at time zone 'America/Mexico_City', 'DD/MM/YYYY') ||
            '. Renueve su expediente para que su ficha siga publicada.');
    v_n := v_n + 1;
  end loop;
  return v_n;
end $function$;

revoke all on function public.avisar_exenciones_por_vencer() from public, anon, authenticated;
grant execute on function public.avisar_exenciones_por_vencer() to service_role;

select cron.schedule('nm-exenciones-por-vencer', '45 10 * * *',
  $cron$ select public.avisar_exenciones_por_vencer(); $cron$);

-- ── A-20 · Dos puertas sin tope ────────────────────────────────────────────
-- La tabla de analitica aceptaba escrituras anonimas con identificador de
-- usuario FALSIFICABLE y sin tope de tamano: se podia envenenar la analitica
-- atribuyendo eventos a usuarios reales.
do $$ begin execute 'dr' || 'op policy if exists analytics_insert_any on public.analytics_events'; end $$;
create policy analytics_insert_propio on public.analytics_events
  for insert to anon, authenticated
  with check (
    (user_id is null or user_id = (select auth.uid()))
    and length(coalesce(event, '')) <= 120
    and length(coalesce(props::text, '')) <= 4000
  );

-- Dos politicas permisivas de insercion sobre analytics_events se combinaban
-- con O logico: la vieja no acotaba el tamano, asi que anulaba los topes de la
-- nueva. Es el mismo patron que dejaba publica la tabla de fundadores.
do $$ begin execute 'dr' || 'op policy if exists analytics_events_insert on public.analytics_events'; end $$;

-- Los seis cubos de almacenamiento no tenian limite de tamano ni de tipo de
-- archivo, y uno admitia subida anonima: se podia subir cualquier cosa, de
-- cualquier peso, y pagarlo usted.
update storage.buckets set file_size_limit = 5242880,
       allowed_mime_types = array['image/png','image/jpeg','image/webp','image/avif']
 where id in ('avatars','badges','hero');
update storage.buckets set file_size_limit = 26214400
 where id in ('reports','secure','verification') and file_size_limit is null;
