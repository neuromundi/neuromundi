-- ============================================================================
-- 0156 · Corrige el tipo de `email` en admin_members
--
-- `auth.users.email` es `character varying(255)`, no `text`, y la firma de
-- `admin_members` declaraba `email text`. Postgres no convierte implícitamente
-- en un RETURNS TABLE: la función se creaba sin problema y fallaba al
-- EJECUTARSE, con «structure of query does not match function result type».
--
-- Es decir: la migración 0155 se aplicó «con éxito» y la función estaba rota.
-- Por eso se prueban las funciones ejecutándolas, no dándolas por buenas porque
-- la migración no dio error.
--
-- Se corrige con un cast explícito. 0155 se deja como se aplicó, para que el
-- historial refleje lo que de verdad pasó.
--
-- Idempotente. NO envía nada.
-- ============================================================================

create or replace function public.admin_members(
  p_estado text default null,
  p_q      text default null,
  p_limit  int  default 300
)
returns table(
  id uuid, member_no bigint, full_name text, business_name text, email text,
  role text, provider_type text, affiliate_type text, country text,
  membership_status text, membership_period text,
  membership_paid_until timestamptz, membership_due_at timestamptz,
  suspended_at timestamptz, suspend_until timestamptz, is_published boolean,
  es_fundador boolean, ficha_id uuid, ficha_verificada boolean,
  created_at timestamptz
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
    and (
      v_q is null
      or p.full_name     ilike '%' || v_q || '%'
      or p.business_name ilike '%' || v_q || '%'
      or u.email::text   ilike '%' || v_q || '%'
      or p.member_no::text = v_q
    )
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 300), 1000));
end $$;

grant execute on function public.admin_members(text, text, int) to authenticated;
