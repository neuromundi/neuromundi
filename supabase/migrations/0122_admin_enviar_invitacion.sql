-- 0122_admin_enviar_invitacion.sql
-- Envío INDIVIDUAL de invitación desde el panel admin. Crea (o reutiliza) una
-- ficha de directorio en 'borrador' (NO se publica) + su invitación con token, y
-- opcionalmente dispara el correo SOLO a esa dirección vía la Edge Function
-- enviar-invitaciones (modo token), sin tocar la cola masiva.
-- Idempotente. Grant a authenticated (la autorización real es is_admin() dentro).

create or replace function public.admin_enviar_invitacion(
  p_correo text,
  p_nombre text,
  p_provider_type text default 'service_provider',
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

  -- Reutiliza la ficha existente con ese correo, o crea una en borrador (privada).
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

  -- Reutiliza una invitación viva para esa ficha, o crea una nueva con token.
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

  -- Envío acotado a ESA invitación (best-effort; no bloquea la creación).
  if p_send then
    begin
      perform net.http_post(
        url := 'https://sboagswcehuxwfjdbhdn.supabase.co/functions/v1/enviar-invitaciones',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'), '')
        ),
        body := jsonb_build_object('send', true, 'token', v_token, 'limit', 1)
      );
    exception when others then
      null;
    end;
  end if;

  return query select v_token, v_dir, p_send;
end;
$function$;

grant execute on function public.admin_enviar_invitacion(text, text, text, boolean) to authenticated;
