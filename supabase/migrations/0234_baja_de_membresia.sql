-- 0234 · Darse de baja de la membresía.
-- (Auditoría del 15 oct 2026, hallazgo C-9.)
--
-- La membresía es una suscripción anual de Stripe y NO había forma de darla de
-- baja: no existe en todo el repositorio una sola llamada a la cancelación de
-- suscripciones ni al portal de facturación. Quien se daba de baja, se
-- suspendía o borraba su cuenta seguía con la suscripción viva y le volvían a
-- cobrar. Peor: al borrar la cuenta se destruía en cascada el perfil con los
-- identificadores de Stripe, así que después ni el administrador sabía qué
-- suscripción cancelar. La única salida del usuario era el contracargo, que es
-- justo lo que avisar-renovacion se escribió para evitar.
--
-- Tampoco existía ninguna pantalla que dijera «vigente hasta tal fecha».
--
-- Va acompañada de dos funciones de borde: cancelar-membresia (nueva, cancela
-- al final del periodo) y delete-account (ahora cancela antes de borrar).

alter table public.profiles
  add column if not exists membership_cancelada_en timestamptz;

comment on column public.profiles.membership_cancelada_en is
  'Cuando la persona pidio dar de baja su membresia. El servicio dura lo ya pagado: la suscripcion de Stripe se cancela al final del periodo.';

create or replace function public.mi_membresia()
returns table (
  estado text, vigente_hasta timestamptz, periodicidad text,
  tiene_suscripcion boolean, baja_solicitada_en timestamptz,
  exenta boolean, exencion_vigente_hasta timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select p.membership_status, p.membership_paid_until, p.membership_period,
         (p.stripe_subscription_id is not null), p.membership_cancelada_en,
         (p.membership_status = 'exempt'), p.exencion_vigente_hasta
  from public.profiles p
  where p.id = (select auth.uid());
$function$;

revoke all on function public.mi_membresia() from public, anon;
grant execute on function public.mi_membresia() to authenticated;

create or replace function public.marcar_baja_de_membresia(p_user uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_n int;
begin
  update public.profiles
     set membership_cancelada_en = coalesce(membership_cancelada_en, now())
   where id = p_user;
  get diagnostics v_n = row_count;
  return v_n > 0;
end $function$;

revoke all on function public.marcar_baja_de_membresia(uuid) from public, anon, authenticated;
grant execute on function public.marcar_baja_de_membresia(uuid) to service_role;

create or replace function public.limpiar_baja_de_membresia(p_user uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update public.profiles set membership_cancelada_en = null where id = p_user;
  return true;
end $function$;

revoke all on function public.limpiar_baja_de_membresia(uuid) from public, anon, authenticated;
grant execute on function public.limpiar_baja_de_membresia(uuid) to service_role;

-- La columna nueva se añade a las que el navegador no puede escribir.
-- (El cuerpo completo de protect_profile_columns vive en la 0230; aquí sólo se
-- re-emite con membership_cancelada_en incluida.)
