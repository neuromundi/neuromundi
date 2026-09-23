-- 0118: avisa por correo a admin@neuromundi.com cuando se crea un perfil nuevo
-- (registro directo o reclamo de ficha por invitación; ambos insertan en
-- profiles). El trigger llama a la Edge Function notify-admin-signup vía pg_net,
-- con el secreto compartido leído de Vault (name='cron_secret'). Best-effort:
-- nunca bloquea el alta.
create or replace function public.tg_notify_admin_signup()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
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
      'member_no', NEW.member_no
    )
  );
  return NEW;
exception when others then
  return NEW;
end;
$function$;

drop trigger if exists trg_notify_admin_signup on public.profiles;
create trigger trg_notify_admin_signup
  after insert on public.profiles
  for each row execute function public.tg_notify_admin_signup();
