-- 0105_my_membership_promo.sql
-- Versión "propia" de membership_promo: el usuario consulta SU código promocional
-- activo (vía auth.uid()), sin poder pasar un uuid ajeno. La usa el cliente para
-- previsualizar el precio del primer pago con la promo ya aplicada, incluso si se
-- canjeó en una sesión anterior (el modal solo conocía la canjeada en el momento).
--
-- Refleja EXACTAMENTE el cuerpo de membership_promo(p_user) (0078), pero acotado al
-- usuario autenticado. Además cierra el acceso directo de `authenticated` a la
-- firma con uuid arbitrario: esa la sigue usando el servidor con service_role en
-- create-membership-checkout (no se toca su grant a service_role).
--
-- Idempotente: create or replace + revoke/grant repetibles.

create or replace function public.my_membership_promo()
returns table (benefit text, percent_off integer, amount_off numeric, amount_currency text)
language sql stable security definer set search_path = public as $$
  select pc.benefit, pc.percent_off, pc.amount_off, pc.amount_currency
  from public.profiles p
  join public.promo_codes pc on pc.code = p.promo_code_used
  where p.id = auth.uid()
    and pc.benefit in ('percent', 'amount')
    and pc.is_active
    and (pc.expires_at is null or pc.expires_at > now())
  limit 1;
$$;

revoke all on function public.my_membership_promo() from public;
grant execute on function public.my_membership_promo() to authenticated, service_role;

-- Cierra el acceso directo de clientes a la versión con uuid arbitrario (fuga
-- menor de información de promo de terceros). El servidor conserva su grant.
revoke execute on function public.membership_promo(uuid) from authenticated;
