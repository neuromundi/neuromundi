-- EL AVISO DE "FICHA RECLAMADA" DECIA "Sin nombre (parent)" (21 oct 2026).
--
-- Visto en el buzon de admin@neuromundi.com: los dos primeros reclamos reales
-- de la campana —APAC Queretaro e Incluyeme en tu Mundo— llegaron como
-- "Ficha reclamada: Sin nombre (parent)". Los datos en la base estan BIEN
-- (role=provider, provider_type=ngo, con su nombre); lo que estaba mal era el
-- aviso.
--
-- Causa: trg_notify_admin_signup disparaba AFTER INSERT. Al reclamar, la fila
-- de profiles la crea primero el alta de la cuenta, con los valores por
-- defecto (role 'parent', sin nombre), y reclamar-ficha la completa DESPUES
-- con un upsert. El aviso salia con la foto del primer instante.
--
-- Ahora avisa UNA sola vez, cuando el perfil adquiere nombre:
--   · alta directa que ya trae nombre  -> avisa en el INSERT
--   · reclamo (nace sin nombre)        -> avisa en el UPDATE que se lo pone
-- Una fila que nunca llega a tener nombre no genera aviso, que es lo correcto:
-- es un cascaron vacio.
create or replace function public.tg_notify_admin_signup()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_origen text;
  v_nombre text;
  v_nombre_antes text;
begin
  v_nombre := coalesce(nullif(NEW.business_name, ''), nullif(NEW.full_name, ''), '');
  -- Todavia sin nombre: no es momento de avisar, el UPDATE lo hara.
  if v_nombre = '' then
    return NEW;
  end if;

  if TG_OP = 'UPDATE' then
    v_nombre_antes := coalesce(nullif(OLD.business_name, ''), nullif(OLD.full_name, ''), '');
    -- Ya tenia nombre: este aviso ya se envio en su momento.
    if v_nombre_antes <> '' then
      return NEW;
    end if;
  end if;

  select u.raw_user_meta_data->>'origen' into v_origen
    from auth.users u where u.id = NEW.id;

  perform net.http_post(
    url := 'https://sboagswcehuxwfjdbhdn.supabase.co/functions/v1/notify-admin-signup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'), '')
    ),
    body := jsonb_build_object(
      'name', v_nombre,
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

create or replace trigger trg_notify_admin_signup
  after insert or update of business_name, full_name on public.profiles
  for each row execute function public.tg_notify_admin_signup();
