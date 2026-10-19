-- El panel lista SOLO invitaciones realmente enviadas, pero el aviso de
-- "invitacion abierta" se disparaba con cualquier enlace abierto, enviado o no.
-- Resultado: llegaba un correo y una notificacion por una invitacion que no
-- aparece en ninguna lista, y no habia forma de cuadrar una cosa con la otra.
-- Medido el 19 de octubre de 2026 con una invitacion de ensayo nunca enviada.
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
  select i.id, (i.abierta_en is null), i.correo, i.directorio_id
    into v_id, v_primera, v_correo, v_dir
    from public.directorio_invitaciones i
   where i.token = p_token
     and i.cancelada_en is null
     and i.baja_en is null
     -- Solo las que de verdad salieron: asi el aviso y el panel cuentan lo mismo.
     and i.enviada_en is not null
   limit 1;

  if v_id is null then
    return;
  end if;

  update public.directorio_invitaciones
     set abierta_en = coalesce(abierta_en, now()),
         abierta_ultima_en = now(),
         aperturas = aperturas + 1
   where id = v_id;

  if v_primera then
    select d.nombre into v_nombre from public.directorio d where d.id = v_dir;

    perform public.notify_admins(
      'invite_opened',
      'Invitación abierta',
      coalesce(nullif(v_nombre, ''), 'Un invitado') || ' abrió su invitación por primera vez.',
      jsonb_build_object('directorio_id', v_dir, 'correo', v_correo, 'invitacion_id', v_id, 'nombre', coalesce(v_nombre, ''))
    );

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
