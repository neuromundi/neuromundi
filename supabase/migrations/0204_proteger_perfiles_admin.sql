-- ===========================================================================
-- 0204 · Un perfil admin no puede degradarse por accidente.
--
-- Hallazgo (13 oct 2026): reclamar-ficha hace upsert sobre profiles usando el
-- correo de la ficha. Si ese correo ya pertenece a un usuario de Neuromundi,
-- el reclamo SOBRESCRIBE su perfil con role='provider'. La ficha de prueba A
-- apunta a admin@neuromundi.com: pulsar el boton habria convertido la cuenta
-- de administracion en un proveedor y le habria quitado el panel de admin.
--
-- protect_profile_columns() NO cubre este caso: devuelve new sin tocar nada
-- cuando auth.uid() es null, y la funcion de borde corre con rol de servicio,
-- sin sesion de usuario. Por eso hace falta un disparador aparte.
--
-- Hoy solo 2 invitaciones vivas coinciden con un usuario existente (las dos de
-- prueba), pero el riesgo reaparece cada vez que alguien del directorio se
-- registra por su cuenta antes de reclamar su ficha.
--
-- Escape deliberado para cambios legitimos, en la misma transaccion:
--   select set_config('app.permitir_degradar_admin','1',true);
--
-- NOTA: se aplico en dos migraciones separadas (0204_..._fn y 0204_..._trg)
-- porque el canal MCP agota su tiempo con sentencias DROP. Este archivo es el
-- equivalente completo e idempotente.
-- ===========================================================================

create or replace function public.trg_proteger_admin()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if old.role = 'admin' and new.role is distinct from 'admin'
     and coalesce(current_setting('app.permitir_degradar_admin', true), '0') <> '1' then
    raise exception 'perfil_admin_protegido'
      using errcode = 'check_violation',
            hint = 'Este perfil es de administracion. Para cambiarle el rol, fije app.permitir_degradar_admin = 1 en la misma transaccion.';
  end if;
  return new;
end
$$;

revoke all on function public.trg_proteger_admin() from public;

drop trigger if exists proteger_admin on public.profiles;
create trigger proteger_admin
  before update on public.profiles
  for each row execute function public.trg_proteger_admin();
