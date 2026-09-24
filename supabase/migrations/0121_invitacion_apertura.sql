-- 0121_invitacion_apertura.sql
-- Rastreo de APERTURA del enlace de invitación (/reclamar/:token).
-- Cuando el invitado abre el enlace, la página de reclamo llama a
-- marcar_invitacion_abierta(token): estampa la 1ª apertura, la última y un
-- contador; en la PRIMERA apertura avisa al admin (campana + push por el
-- trigger trg_notify_push) y dispara un correo (Edge Function
-- notify-admin-invite-open) por pg_net.
-- Idempotente. Aplica la regla del 30-oct: grants explícitos a anon/authenticated.

-- 1) Columnas de rastreo (abierta_en ya existía; se conserva como "primera apertura").
alter table public.directorio_invitaciones
  add column if not exists abierta_ultima_en timestamptz,
  add column if not exists aperturas integer not null default 0;

-- 2) Clasificación de la notificación nueva (admin): cae en 'otras' por defecto,
--    pero la fijamos explícitamente para que el front y el back coincidan.
create or replace function public.notif_category(p_type text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select case
    when p_type like 'appt_%' or p_type in ('booking_request', 'waitlist_slot') then 'citas'
    when p_type in ('direct_message', 'admin_message', 'account_costo') then 'mensajes'
    when p_type in ('post_achievement', 'badge', 'waitlist_join', 'referral_use', 'referral_reward', 'directory_match', 'suspension_reminder', 'topic_job', 'topic_venue',
                    'forum_new', 'forum_pending', 'forum_approved', 'forum_mod_call', 'forum_mod_approved') then 'comunidad'
    when p_type in ('commission_paid', 'donation_thanks', 'membership_paid') then 'transacciones'
    when p_type = 'campaign' then 'campanas'
    when p_type = 'invite_opened' then 'otras'
    else 'otras'
  end;
$function$;

-- 3) Registrar apertura del enlace. La invoca la página pública de reclamo, así
--    que se otorga a anon/authenticated; el SECURITY DEFINER salta la RLS.
create or replace function public.marcar_invitacion_abierta(p_token text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
  v_primera boolean;
  v_correo text;
  v_dir uuid;
  v_nombre text;
begin
  -- Localiza la invitación viva (aunque ya esté usada: puede reabrir el enlace).
  select i.id, (i.abierta_en is null), i.correo, i.directorio_id
    into v_id, v_primera, v_correo, v_dir
    from public.directorio_invitaciones i
   where i.token = p_token
     and i.cancelada_en is null
     and i.baja_en is null
   limit 1;

  if v_id is null then
    return; -- token inexistente/cancelado: no-op silencioso
  end if;

  update public.directorio_invitaciones
     set abierta_en = coalesce(abierta_en, now()),
         abierta_ultima_en = now(),
         aperturas = aperturas + 1
   where id = v_id;

  if v_primera then
    select d.nombre into v_nombre from public.directorio d where d.id = v_dir;

    -- Campana + push a los administradores.
    perform public.notify_admins(
      'invite_opened',
      'Invitación abierta',
      coalesce(nullif(v_nombre, ''), 'Un invitado') || ' abrió su invitación por primera vez.',
      jsonb_build_object('directorio_id', v_dir, 'correo', v_correo, 'invitacion_id', v_id, 'nombre', coalesce(v_nombre, ''))
    );

    -- Correo al admin (best-effort; nunca debe tumbar el registro de apertura).
    begin
      perform net.http_post(
        url := 'https://sboagswcehuxwfjdbhdn.supabase.co/functions/v1/notify-admin-invite-open',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'), '')
        ),
        body := jsonb_build_object('nombre', coalesce(v_nombre, ''), 'correo', coalesce(v_correo, ''))
      );
    exception when others then
      null;
    end;
  end if;
end;
$function$;

grant execute on function public.marcar_invitacion_abierta(text) to anon, authenticated;

-- 4) Listado para el panel admin (estado + fechas). Solo admin (is_admin()).
--    returns table con columnas calificadas para evitar 42702.
create or replace function public.admin_directorio_invitaciones()
returns table (
  id uuid,
  nombre text,
  correo text,
  provider_type text,
  estado_geo text,
  ciudad text,
  creada_en timestamptz,
  enviada_en timestamptz,
  abierta_en timestamptz,
  abierta_ultima_en timestamptz,
  aperturas integer,
  usada_en timestamptz,
  baja_en timestamptz,
  cancelada_en timestamptz,
  rebotado boolean,
  expira_en timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select i.id,
         d.nombre,
         i.correo,
         d.provider_type,
         d.estado,
         d.ciudad,
         i.creada_en,
         i.enviada_en,
         i.abierta_en,
         i.abierta_ultima_en,
         i.aperturas,
         i.usada_en,
         i.baja_en,
         i.cancelada_en,
         coalesce(d.correo_rebotado, false),
         i.expira_en
    from public.directorio_invitaciones i
    join public.directorio d on d.id = i.directorio_id
   where public.is_admin()
   order by coalesce(i.abierta_ultima_en, i.enviada_en, i.creada_en) desc nulls last
   limit 1000;
$function$;

grant execute on function public.admin_directorio_invitaciones() to authenticated;
