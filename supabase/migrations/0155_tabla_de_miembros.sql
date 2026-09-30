-- ============================================================================
-- 0155 · Control de miembros para el administrador
--
-- EL HUECO
--   Había 25 pantallas de administración y 55 funciones `admin_*`, pero
--   TODAS leían y NINGUNA actuaba sobre la cuenta de un miembro. `AdminRenewals`
--   lista vencimientos, `AdminAccountActions` cuenta bajas: ambas de sólo
--   lectura. No existía manera de suspender, reactivar, exentar ni prorrogar
--   desde el panel.
--
-- LO QUE NO INCLUYE, A PROPÓSITO
--   Baja definitiva. Borrar una cuenta destruye datos que no vuelven, así que
--   sigue siendo un camino aparte y deliberado (`delete-account`), no un botón
--   más en una tabla donde se hacen diez cosas rutinarias. Decisión de Enyoria.
--
-- SEMÁNTICA REUTILIZADA, NO INVENTADA
--   Suspender y reactivar replican exactamente lo que ya hacen
--   `suspend_my_account` y `reactivate_my_account`: mismos campos, misma
--   restauración de `is_published` vía `pre_suspend_published`, misma bitácora
--   en `account_actions`. Si el admin suspende y luego reactiva, el perfil
--   queda como estaba, no «publicado» por omisión.
--
-- Idempotente. NO envía nada.
-- ============================================================================

-- ── Listado ─────────────────────────────────────────────────────────────────
create or replace function public.admin_members(
  p_estado text default null,   -- activo | pendiente | exento | suspendido | vencido | todos
  p_q      text default null,   -- busca en nombre, razón social, correo y número de socio
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
  select p.id, p.member_no, p.full_name, p.business_name, u.email,
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
      or u.email         ilike '%' || v_q || '%'
      or p.member_no::text = v_q
    )
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 300), 1000));
end $$;

-- ── Bitácora común ──────────────────────────────────────────────────────────
create or replace function public.admin_log_account_action(
  p_user uuid, p_action text, p_nota text
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.account_actions (user_id, email, member_no, role, action, reason, reason_detail, is_paid)
  select p_user, u.email, p.member_no::int, p.role, p_action, 'admin', nullif(btrim(coalesce(p_nota,'')),''),
         p.role <> 'parent'
    from public.profiles p left join auth.users u on u.id = p.id
   where p.id = p_user;
end $$;

-- ── Acciones ────────────────────────────────────────────────────────────────
create or replace function public.admin_member_suspend(
  p_user uuid, p_meses int default 6, p_nota text default null
) returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_hasta timestamptz;
begin
  if not public.is_admin() then raise exception 'solo administradores'; end if;
  -- Un admin no puede suspenderse a sí mismo: se quedaría fuera de su panel.
  if p_user = auth.uid() then raise exception 'no puedes suspender tu propia cuenta'; end if;

  v_hasta := now() + (greatest(1, least(coalesce(p_meses, 6), 60)) || ' months')::interval;

  update public.profiles
     set suspended_at = now(),
         suspend_until = v_hasta,
         pre_suspend_published = coalesce(pre_suspend_published, is_published),
         is_published = false
   where id = p_user;
  if not found then raise exception 'perfil no encontrado'; end if;

  perform public.admin_log_account_action(p_user, 'suspend', p_nota);
  return v_hasta;
end $$;

create or replace function public.admin_member_reactivate(
  p_user uuid, p_nota text default null
) returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'solo administradores'; end if;

  update public.profiles
     set suspended_at = null,
         suspend_until = null,
         winback_until = null,
         is_published = coalesce(pre_suspend_published, is_published),
         pre_suspend_published = null
   where id = p_user;
  if not found then raise exception 'perfil no encontrado'; end if;

  perform public.admin_log_account_action(p_user, 'reactivate', p_nota);
  return true;
end $$;

-- Exentar de cuota. Al quitar la exención vuelve a 'pending', no a 'active':
-- que alguien deje de estar exento no significa que haya pagado.
create or replace function public.admin_member_set_exempt(
  p_user uuid, p_value boolean, p_nota text default null
) returns text language plpgsql security definer set search_path = public as $$
declare v_estado text;
begin
  if not public.is_admin() then raise exception 'solo administradores'; end if;

  v_estado := case when coalesce(p_value, false) then 'exempt' else 'pending' end;
  update public.profiles set membership_status = v_estado where id = p_user;
  if not found then raise exception 'perfil no encontrado'; end if;

  perform public.admin_log_account_action(
    p_user, case when coalesce(p_value,false) then 'exempt' else 'unexempt' end, p_nota);
  return v_estado;
end $$;

-- Prorrogar la vigencia. Suma días a lo que quede; si ya venció, cuenta desde
-- hoy, para que prorrogar 30 días signifique siempre 30 días por delante.
create or replace function public.admin_member_extend(
  p_user uuid, p_dias int, p_nota text default null
) returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_base timestamptz; v_nueva timestamptz;
begin
  if not public.is_admin() then raise exception 'solo administradores'; end if;
  if coalesce(p_dias, 0) = 0 then raise exception 'días debe ser distinto de cero'; end if;

  select greatest(coalesce(membership_paid_until, now()), now()) into v_base
    from public.profiles where id = p_user;
  if v_base is null then raise exception 'perfil no encontrado'; end if;

  v_nueva := v_base + (p_dias || ' days')::interval;

  update public.profiles
     set membership_paid_until = v_nueva,
         membership_status = case when p_dias > 0 and membership_status = 'past_due'
                                  then 'active' else membership_status end
   where id = p_user;

  perform public.admin_log_account_action(p_user, 'extend', p_nota);
  return v_nueva;
end $$;

-- El control que faltaba: mover la fecha desde la que las fichas sin confirmar
-- ocultan sus datos de contacto (migración 0154).
create or replace function public.admin_set_verificacion_deadline(p_fecha timestamptz)
returns timestamptz language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'solo administradores'; end if;
  update public.campaign_config set verificacion_deadline = p_fecha, updated_at = now() where id = 1;
  return p_fecha;
end $$;

revoke all on function public.admin_log_account_action(uuid, text, text) from public, anon, authenticated;

grant execute on function public.admin_members(text, text, int) to authenticated;
grant execute on function public.admin_member_suspend(uuid, int, text) to authenticated;
grant execute on function public.admin_member_reactivate(uuid, text) to authenticated;
grant execute on function public.admin_member_set_exempt(uuid, boolean, text) to authenticated;
grant execute on function public.admin_member_extend(uuid, int, text) to authenticated;
grant execute on function public.admin_set_verificacion_deadline(timestamptz) to authenticated;
