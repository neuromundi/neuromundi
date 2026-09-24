-- 0123_invitacion_fundador.sql
-- Añade la opción "invitar como fundador" al envío individual: p_fundador controla
-- SOLO el encuadre del correo (con/ sin beneficios de Miembro Fundador). NO cambia
-- la elegibilidad real de fundador (esa se gana automáticamente al cumplir requisitos).
-- Cambia la firma de admin_enviar_invitacion → drop del anterior + create nuevo.

drop function if exists public.admin_enviar_invitacion(text, text, text, boolean);

create or replace function public.admin_enviar_invitacion(
  p_correo text,
  p_nombre text,
  p_provider_type text default 'service_provider',
  p_fundador boolean default true,
  p_send boolean default true
)
returns table (token text, ficha_id uuid, enviado boolean)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_dir uuid;
  v_token text;
  v_inv uuid;
begin
  if not public.is_admin() then
    raise exception 'no autorizado';
  end if;
  if p_correo is null or p_correo !~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then
    raise exception 'correo inválido';
  end if;

  select d.id into v_dir
    from public.directorio d
   where lower(d.correo) = lower(p_correo)
   limit 1;

  if v_dir is null then
    insert into public.directorio (nombre, correo, provider_type, sector, fuente, estado_revision)
    values (
      coalesce(nullif(btrim(p_nombre), ''), 'Invitación'),
      lower(p_correo),
      coalesce(nullif(p_provider_type, ''), 'service_provider'),
      'privado',
      'curado',
      'borrador'
    )
    returning id into v_dir;
  end if;

  select i.id, i.token into v_inv, v_token
    from public.directorio_invitaciones i
   where i.directorio_id = v_dir
     and i.usada_en is null and i.baja_en is null and i.cancelada_en is null
     and i.expira_en > now()
   order by i.creada_en desc
   limit 1;

  if v_inv is null then
    insert into public.directorio_invitaciones (directorio_id, correo)
    values (v_dir, lower(p_correo))
    returning id, token into v_inv, v_token;
  end if;

  if p_send then
    begin
      perform net.http_post(
        url := 'https://sboagswcehuxwfjdbhdn.supabase.co/functions/v1/enviar-invitaciones',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'), '')
        ),
        body := jsonb_build_object('send', true, 'token', v_token, 'limit', 1, 'fundador', p_fundador)
      );
    exception when others then
      null;
    end;
  end if;

  return query select v_token, v_dir, p_send;
end;
$function$;

grant execute on function public.admin_enviar_invitacion(text, text, text, boolean, boolean) to authenticated;
