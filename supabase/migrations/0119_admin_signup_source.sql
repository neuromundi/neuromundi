-- 0119: el aviso al admin distingue el ORIGEN del alta. reclamar-ficha crea el
-- usuario con user_metadata.origen='ficha_directorio'; el registro directo no.
-- El trigger lee ese metadato de auth.users y lo pasa como 'source' (claim|signup)
-- a notify-admin-signup, que lo muestra en el correo. Idempotente.
create or replace function public.tg_notify_admin_signup()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_origen text;
begin
  select u.raw_user_meta_data->>'origen' into v_origen
    from auth.users u where u.id = NEW.id;

  perform net.http_post(
    url := 'https://sboagswcehuxwfjdbhdn.supabase.co/functions/v1/notify-admin-signup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'), '')
    ),
    body := jsonb_build_object(
      'name', coalesce(nullif(NEW.business_name, ''), nullif(NEW.full_name, ''), ''),
      'role', NEW.role,
      'provider_type', NEW.provider_type,
      'country', NEW.country,
      'member_no', NEW.member_no,
      'source', case when v_origen = 'ficha_directorio' then 'claim' else 'signup' end
    )
  );
  return NEW;
exception when others then
  return NEW;
end;
$function$;
