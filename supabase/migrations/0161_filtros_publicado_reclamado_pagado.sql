-- ============================================================================
-- 0161 · Filtros de publicación, reclamo y pago en la tabla de miembros
--
-- Tres ejes que el administrador necesita cruzar y que no estaban:
--   · publicado / sin publicar  → quién es invisible en el directorio
--   · reclamado / sin reclamar  → quién respondió a la invitación
--   · pagado / sin pagar        → quién convirtió
--
-- Juntos responden la pregunta que importa durante la campaña: «¿quién reclamó
-- su ficha, pagó, y aun así no aparece?». Antes había que revisar fila por fila.
--
-- `ha_pagado` se deriva de tener suscripción de Stripe o una vigencia registrada.
-- No se usa `membership_status = 'active'` porque una cuenta exenta también está
-- activa sin haber pagado nunca, y son cosas distintas.
--
-- Idempotente. NO envía nada.
-- ============================================================================

create or replace function public.admin_members(
  p_estado     text    default null,
  p_q          text    default null,
  p_limit      int     default 300,
  p_pais       text    default null,
  p_seccion    text    default null,
  p_fundador   boolean default null,
  p_tipo       text    default null,
  p_publicado  boolean default null,
  p_reclamado  boolean default null,
  p_pagado     boolean default null
)
returns table(
  id uuid, member_no bigint, full_name text, business_name text, email text,
  role text, provider_type text, affiliate_type text, country text,
  membership_status text, membership_period text,
  membership_paid_until timestamptz, membership_due_at timestamptz,
  suspended_at timestamptz, suspend_until timestamptz, is_published boolean,
  es_fundador boolean, ficha_id uuid, ficha_verificada boolean,
  sections text[], ha_pagado boolean, created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
declare v_q text := nullif(btrim(coalesce(p_q,'')), '');
begin
  if not public.is_admin() then
    raise exception 'solo administradores';
  end if;
  return query
  select p.id, p.member_no, p.full_name, p.business_name, u.email::text,
         p.role, p.provider_type, public.affiliate_type_for(p.id), p.country,
         p.membership_status, p.membership_period,
         p.membership_paid_until, p.membership_due_at,
         p.suspended_at, p.suspend_until, p.is_published,
         exists (select 1 from public.founder_members f where f.user_id = p.id),
         d.id,
         (d.id is not null and (d.reclamada_por is not null or coalesce(d.verificada_manual,false))),
         coalesce(p.sections, '{}'::text[]),
         (p.stripe_subscription_id is not null or p.membership_paid_until is not null),
         p.created_at
  from public.profiles p
  left join auth.users u on u.id = p.id
  left join public.directorio d on d.reclamada_por = p.id
  where (
      p_estado is null or p_estado = 'todos'
      or (p_estado = 'suspendido' and p.suspended_at is not null)
      or (p_estado = 'activo'     and p.membership_status = 'active'  and p.suspended_at is null)
      or (p_estado = 'pendiente'  and p.membership_status = 'pending' and p.suspended_at is null)
      or (p_estado = 'exento'     and p.membership_status = 'exempt')
      or (p_estado = 'vencido'    and (p.membership_status = 'past_due'
            or (p.membership_paid_until is not null and p.membership_paid_until < now())))
    )
    and (v_q is null
      or p.full_name     ilike '%' || v_q || '%'
      or p.business_name ilike '%' || v_q || '%'
      or u.email::text   ilike '%' || v_q || '%'
      or p.member_no::text = v_q)
    and (p_pais is null or p.country = p_pais)
    and (p_seccion is null or p_seccion = any(coalesce(p.sections, '{}'::text[])))
    and (p_fundador is null
      or p_fundador = exists (select 1 from public.founder_members f where f.user_id = p.id))
    and (p_tipo is null or p.provider_type = p_tipo)
    and (p_publicado is null or p_publicado = p.is_published)
    and (p_reclamado is null or p_reclamado = (d.id is not null))
    and (p_pagado is null or p_pagado =
          (p.stripe_subscription_id is not null or p.membership_paid_until is not null))
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 300), 1000));
end $$;

grant execute on function public.admin_members(text, text, int, text, text, boolean, text, boolean, boolean, boolean) to authenticated;
