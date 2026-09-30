-- ============================================================================
-- 0159 · Publicar al pagar (opción 1) y filtros de la tabla de miembros
--
-- ── 1. PUBLICAR AL PAGAR ────────────────────────────────────────────────────
--   `profiles.is_published` nace en false y nada lo encendía: ni completar el
--   perfil, ni pagar. Alguien pagaba por visibilidad y quedaba invisible,
--   esperando una casilla enterrada en Ajustes que nadie le mencionó.
--
--   La 0158 ya cubrió a quien llega por una ficha del directorio. Esto cubre a
--   quien se registra por su cuenta y paga.
--
--   SOLO EN EL PRIMER PAGO, no en las renovaciones. Si alguien se despublica a
--   propósito, la renovación anual no debe volver a exponerlo: eso sería
--   revertirle una decisión deliberada cada doce meses.
--
--   Tampoco republica cuentas suspendidas.
--
-- ── 2. FILTROS DE LA TABLA DE MIEMBROS ──────────────────────────────────────
--   País, sección madre (neurodesarrollo / neurodivergencias / afecciones),
--   fundador o no fundador, y tipo de perfil. Se componen entre sí y con el
--   filtro de estado y la búsqueda que ya existían.
--
-- Idempotente. NO envía nada.
-- ============================================================================

create or replace function public.publicar_por_pago(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
     set is_published = true
   where id = p_id
     and suspended_at is null
     and is_published = false;
  return found;
end $$;

revoke all on function public.publicar_por_pago(uuid) from public, anon, authenticated;

comment on function public.publicar_por_pago(uuid) is
  'La llama el webhook de Stripe SOLO en checkout.session.completed (primer '
  'pago), nunca en invoice.paid: una renovación no debe revertir a quien se '
  'despublicó a propósito.';

-- ── Listado con filtros ─────────────────────────────────────────────────────
create or replace function public.admin_members(
  p_estado   text    default null,
  p_q        text    default null,
  p_limit    int     default 300,
  p_pais     text    default null,
  p_seccion  text    default null,   -- neurodesarrollo | neurodivergencias | afecciones
  p_fundador boolean default null,   -- true = sólo fundadores, false = sólo no fundadores
  p_tipo     text    default null    -- provider_type
)
returns table(
  id uuid, member_no bigint, full_name text, business_name text, email text,
  role text, provider_type text, affiliate_type text, country text,
  membership_status text, membership_period text,
  membership_paid_until timestamptz, membership_due_at timestamptz,
  suspended_at timestamptz, suspend_until timestamptz, is_published boolean,
  es_fundador boolean, ficha_id uuid, ficha_verificada boolean,
  sections text[], created_at timestamptz
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
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 300), 1000));
end $$;

grant execute on function public.admin_members(text, text, int, text, text, boolean, text) to authenticated;

-- Los países y tipos que de verdad existen, para poblar los desplegables sin
-- ofrecer filtros que no devuelven a nadie.
create or replace function public.admin_members_facetas()
returns table(paises text[], tipos text[])
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'solo administradores'; end if;
  return query
  select
    (select coalesce(array_agg(distinct country order by country), '{}')
       from public.profiles where country is not null and btrim(country) <> ''),
    (select coalesce(array_agg(distinct provider_type order by provider_type), '{}')
       from public.profiles where provider_type is not null);
end $$;

grant execute on function public.admin_members_facetas() to authenticated;
