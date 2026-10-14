-- 0214 — Cuota mensual ordinaria para la pantalla de pago.
--
-- LA FALLA QUE CORRIGE: my_membership_options() resuelve TODA la fila con
-- member_class = 'founder' cuando el usuario es elegible, e incluye en ella el
-- monthly_amount de fundador. Pero create-membership-checkout cobra la clase
-- 'ordinary' en cuanto el periodo es mensual (el descuento de fundador es solo
-- para el anual). Resultado: el modal enseñaba MXN 250 al mes y Stripe cobraba
-- MXN 500. Precio mostrado distinto del precio cobrado, que es justo el
-- supuesto de hecho de una disputa de cargo.
--
-- No se puede cambiar el tipo de retorno de my_membership_options sin
-- eliminarla antes, asi que se agrega esta funcion aparte: devuelve la cuota
-- mensual ORDINARIA, que es la que de verdad se va a cobrar, para que el modal
-- la pinte en la tarjeta de pago mensual.
create or replace function my_membership_monthly_ordinary()
returns table (currency text, monthly_amount numeric)
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_me uuid := auth.uid();
  v_type text;
  v_country text;
begin
  if v_me is null then return; end if;
  v_type := public.affiliate_type_for(v_me);
  select p.country into v_country from public.profiles p where p.id = v_me;
  return query
  select pr.currency, pr.monthly_amount
  from public.membership_price_for(v_type, coalesce(v_country, ''), 'ordinary', 'monthly') pr;
end;
$fn$;

grant execute on function my_membership_monthly_ordinary() to authenticated;
