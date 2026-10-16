-- 0246 · M-7 (segunda mitad): los avisos que van AL MIEMBRO dejan de llevar el
-- texto escrito dentro del SQL.
--
-- El problema: la fila de notifications traia el texto ya redactado, en
-- espanol. El miembro coreano leia "Su perfil dejo de aparecer en el
-- directorio". Traducirlo no se puede hacer sustituyendo el texto por una
-- clave fija, porque varios cuerpos llevan una FECHA o una NOTA dentro: la
-- clave fija borraria ese dato.
--
-- La solucion: el tipo del aviso identifica la frase y el jsonb `data` lleva
-- los huecos. La pantalla compone con la traduccion del idioma del lector y
-- rellena los huecos. El texto en espanol se conserva en la fila como ultimo
-- recurso, por si algun dia falta la clave.
--
-- ALCANCE, dicho con claridad: esto cubre los avisos que ve el MIEMBRO. Los
-- avisos que solo ve el administrador (solicitud de exencion, pregunta al
-- experto, solicitud de fundador, rafaga de reservas) siguen en espanol a
-- proposito: los lee quien administra la plataforma, que trabaja en espanol, y
-- traducirlos a once idiomas no le sirve a nadie.
--
-- Donde habia UNA frase con variantes, ahora hay DOS TIPOS. Asi cada tipo
-- corresponde a una sola frase y la pantalla no tiene que decidir nada.

-- El asesor de seguridad marcaba esta funcion por no fijar search_path. Es de
-- hoy y es mia: devuelve una constante, no hay riesgo real, pero se cierra.
create or replace function public.reglamento_vigente()
returns text
language sql
immutable
set search_path to 'public'
as $function$ select '2026-07'::text; $function$;

create or replace function public.admin_exencion_resolver(
  p_user uuid, p_aprobar boolean, p_nota text default null, p_meses integer default 12
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_tipo text; v_hasta timestamptz; v_nota text;
begin
  if not public.is_admin() then raise exception 'solo administradores'; end if;
  select exencion_tipo into v_tipo from public.profiles where id = p_user;
  if v_tipo is null then raise exception 'ese perfil no tiene solicitud de exencion'; end if;
  v_nota := nullif(btrim(coalesce(p_nota,'')), '');

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

    if v_hasta is null then
      insert into public.notifications (user_id, type, title, body, data)
      values (p_user, 'exencion_aprobada', 'Su exención de cuota fue aprobada',
              'No se le pedirá cuota de membresía.', '{}'::jsonb);
    else
      insert into public.notifications (user_id, type, title, body, data)
      values (p_user, 'exencion_aprobada_hasta', 'Su exención de cuota fue aprobada',
              'No se le pedirá cuota hasta el '
                || to_char(v_hasta at time zone 'America/Mexico_City', 'DD/MM/YYYY')
                || '. Le avisaremos antes de esa fecha.',
              jsonb_build_object('fecha', to_char(v_hasta at time zone 'America/Mexico_City', 'DD/MM/YYYY')));
    end if;
  else
    update public.profiles
       set membership_status = case when membership_status = 'exempt' then 'pending' else membership_status end,
           exencion_aprobada_en = null,
           exencion_aprobada_por = null,
           exencion_vigente_hasta = now(),
           exencion_rechazo = v_nota
     where id = p_user;
    perform public.admin_log_account_action(p_user, 'exencion_rechazada', p_nota);

    if v_nota is null then
      insert into public.notifications (user_id, type, title, body, data)
      values (p_user, 'exencion_rechazada', 'Su solicitud de exención no procedió',
              'Revise su expediente en el panel y vuelva a enviarlo si procede.', '{}'::jsonb);
    else
      insert into public.notifications (user_id, type, title, body, data)
      values (p_user, 'exencion_rechazada_motivo', 'Su solicitud de exención no procedió',
              v_nota, jsonb_build_object('motivo', v_nota));
    end if;
  end if;
  return true;
end $function$;

create or replace function public.avisar_exenciones_por_vencer()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_n int := 0; r record; v_fecha text;
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
    v_fecha := to_char(r.exencion_vigente_hasta at time zone 'America/Mexico_City', 'DD/MM/YYYY');
    insert into public.notifications (user_id, type, title, body, data)
    values (r.id, 'exencion_por_vencer', 'Su exención de cuota está por vencer',
            'Vence el ' || v_fecha || '. Renueve su expediente para que su ficha siga publicada.',
            jsonb_build_object('fecha', v_fecha));
    v_n := v_n + 1;
  end loop;
  return v_n;
end $function$;

revoke all on function public.avisar_exenciones_por_vencer() from public, anon, authenticated;
grant execute on function public.avisar_exenciones_por_vencer() to service_role;

-- Los dos tipos nuevos de exencion entran en la misma categoria que el viejo.
create or replace function public.notif_category(p_type text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select case
    when p_type like 'appt_%' or p_type in ('booking_request', 'waitlist_slot', 'reservas_en_rafaga') then 'citas'
    when p_type in ('direct_message', 'admin_message', 'account_costo', 'pregunta_experto') then 'mensajes'
    when p_type in ('post_achievement', 'badge', 'waitlist_join', 'referral_use', 'referral_reward',
                    'directory_match', 'suspension_reminder', 'topic_job', 'topic_venue',
                    'forum_new', 'forum_pending', 'forum_approved', 'forum_mod_call', 'forum_mod_approved',
                    'donor_wall', 'founder_wall', 'muro_de_fundadores', 'invite_opened') then 'comunidad'
    -- Dinero y permanencia en el directorio.
    when p_type like 'exencion_%' or p_type in (
                    'commission_paid', 'donation_thanks', 'membership_paid', 'pago_terapia',
                    'founder_request', 'founder_request_approved', 'fundador_resolicita',
                    'empresa_limitada', 'empresa_reactivada', 'empresa_sin_directorio',
                    'directory_grace', 'stock_agotado') then 'transacciones'
    when p_type = 'campaign' then 'campanas'
    else 'otras'
  end;
$function$;
