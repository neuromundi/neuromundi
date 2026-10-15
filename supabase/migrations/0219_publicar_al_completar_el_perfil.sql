-- 0219 — Se paga por visibilidad: que la visibilidad llegue.
--
-- LA FALLA. publicar_por_pago se llama UNA sola vez, en el primer pago, y
-- exige perfil completo (avatar, biografia, telefono y pais) ademas de cuota
-- cubierta. Quien paga antes de terminar su perfil no se publica, el resultado
-- se descarta sin mirarlo, y NADA vuelve a intentarlo cuando despues sube la
-- foto. Pago hecho, servicio invisible, y la persona depende de descubrir por
-- su cuenta una casilla en Ajustes que nadie le menciono.
--
-- LA CORRECCION. Un disparador sobre profiles: cada vez que un perfil cambia y
-- pasa a cumplir los requisitos, se publica solo. Cubre los dos ordenes —pagar
-- y luego completar, o completar y luego pagar— y no depende de que el webhook
-- acierte el momento.
--
-- Lo que NO hace: republicar a quien se despublico a proposito. Solo actua
-- cuando antes NO se cumplian los requisitos y ahora si; si alguien ya los
-- cumplia y apago su publicacion deliberadamente, esta funcion no lo toca.

create or replace function public.tg_publicar_al_completar()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare v_antes boolean; v_ahora boolean;
begin
  -- Nada que hacer si ya esta publicado o si esta suspendido.
  if coalesce(new.is_published, false) or new.suspended_at is not null then
    return new;
  end if;
  -- Si esta misma operacion es la que lo esta publicando, se deja pasar.
  if new.is_published is distinct from old.is_published then
    return new;
  end if;

  v_ahora := public.perfil_completo(new.id) and public.cuota_cubierta(new.id);
  if not v_ahora then return new; end if;

  -- Solo en la TRANSICION. Se recalcula el estado anterior con los valores de
  -- old para no republicar a quien se despublico a proposito teniendo ya todo
  -- en regla.
  v_antes := coalesce(old.avatar_url, '') <> ''
         and coalesce(old.bio, '') <> ''
         and coalesce(old.phone, '') <> ''
         and coalesce(old.country, '') <> ''
         and (old.membership_status in ('active','exempt')
              or (old.membership_paid_until is not null and old.membership_paid_until > now()));
  if v_antes then return new; end if;

  new.is_published := true;

  insert into public.notifications (user_id, type, title, body, data)
  values (new.id, 'profile_published', 'Su perfil ya esta publicado',
          'Completo lo que faltaba y su perfil ya aparece en el directorio.',
          jsonb_build_object('motivo', 'requisitos_completados'));
  return new;
end;
$fn$;

drop trigger if exists trg_publicar_al_completar on public.profiles;
create trigger trg_publicar_al_completar
  before update on public.profiles
  for each row execute function public.tg_publicar_al_completar();

-- Y el rezago que ya existe: quien hoy cumple requisitos y sigue sin publicar.
-- Hoy son 0 perfiles, pero la sentencia queda para que la migracion sea
-- completa si se aplica mas tarde.
update public.profiles p
   set is_published = true
 where p.is_published = false
   and p.suspended_at is null
   and public.cumple_requisitos(p.id);
