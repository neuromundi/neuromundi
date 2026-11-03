-- Cierra la alerta CRÍTICA del Security Advisor de Supabase (rls_disabled_in_public,
-- medida el 31 oct 2026, avisada por correo el 3 nov): la tabla de respaldo
-- `respaldo_plan_invitacion_20261021` quedó SIN RLS y, con los GRANTs por
-- omisión (se creó el 21 oct, antes de la regla del 30 oct), `anon` podía
-- LEERLA, MODIFICARLA y BORRARLA (SELECT/INSERT/UPDATE/DELETE/TRUNCATE).
-- Son 1.122 filas del plan de invitaciones (ficha, tanda, score, motivo, carril).
--
-- Es un RESPALDO / punto de restauración: ningún cliente debe tocarla. Se activa
-- RLS SIN políticas (deny-by-default: anon y authenticated quedan sin acceso;
-- service_role y las funciones SECURITY DEFINER siguen operando para una eventual
-- restauración) y se revocan los privilegios de cliente por si acaso.
--
-- Idempotente y a prueba de que la tabla ya no exista (si algún día se depura el
-- respaldo, esta migración no falla al reaplicarse).
do $$
begin
  if to_regclass('public.respaldo_plan_invitacion_20261021') is not null then
    execute 'alter table public.respaldo_plan_invitacion_20261021 enable row level security';
    execute 'revoke all on public.respaldo_plan_invitacion_20261021 from anon, authenticated';
  end if;
end $$;
