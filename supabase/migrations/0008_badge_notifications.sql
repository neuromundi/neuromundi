-- ============================================================================
-- Distintivo: notificación automática cuando el proveedor SUBE de nivel
-- ----------------------------------------------------------------------------
-- Guarda el último nivel notificado en profiles.badge_level. Al recalcular, si
-- el nivel sube, inserta una notificación (type='badge'). Se dispara:
--   * de inmediato cuando el admin aprueba la validación documental (trigger), y
--   * periódicamente con refresh_all_badges() (para transiciones por tiempo:
--     antigüedad del descuento, ventana de "nuevo ingreso", reseñas, etc.).
-- La lógica del NIVEL replica src/lib/badge (empatía 18/20 ⟺ trato humano ≥ 4.5).
-- Idempotente.
-- ============================================================================

alter table public.profiles add column if not exists badge_level text;

-- Nivel del distintivo (solo el nivel; misma regla que el motor de la app).
create or replace function public.compute_provider_level(p_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_verified boolean;
  v_created  timestamptz;
  v_rating   numeric;
  v_emp      numeric;
  v_total    integer;
  v_disc     numeric;
begin
  select coalesce(is_verified, false), created_at into v_verified, v_created
  from public.profiles where id = p_id;
  if not found then return null; end if;

  select evs_score, avg_human_treatment, coalesce(total_reviews, 0)
    into v_rating, v_emp, v_total
  from public.public_provider_ratings where provider_id = p_id;

  select greatest(
    coalesce((
      select max(o.discount_value) from public.offers o
      where o.provider_id = p_id and o.discount_type = 'percentage'
        and o.discount_value is not null and o.status = 'active'
        and (o.valid_from is null or o.valid_from <= now())
        and (o.valid_until is null or o.valid_until >= now())
        and coalesce(o.valid_from, o.created_at) <= now() - interval '14 days'
    ), 0),
    case when v_created <= now() - interval '14 days'
      then coalesce((select (provider_details ->> 'discount_pct')::numeric
                     from public.profiles where id = p_id), 0)
      else 0 end
  ) into v_disc;

  if not v_verified then return null; end if;                                  -- Filtro Cero
  if v_disc >= 15 and v_rating is not null and v_rating >= 4.8
     and coalesce(v_emp, 0) >= 4.5 then return 'embajador'; end if;            -- empatía ≥18/20
  if v_disc >= 10 and v_rating is not null and v_rating >= 4.5 then return 'aliado'; end if;
  if coalesce(v_total, 0) < 5 or (v_rating is not null and v_rating >= 4.0) then return 'miembro'; end if;
  return null;
end;
$$;

-- Rango numérico del nivel (para saber si "sube").
create or replace function public.badge_rank(lvl text)
returns integer language sql immutable as $$
  select case lvl when 'miembro' then 1 when 'aliado' then 2 when 'embajador' then 3 else 0 end;
$$;

-- Recalcula el nivel de un proveedor; si SUBE, notifica. Devuelve el nivel nuevo.
create or replace function public.refresh_provider_badge(p_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_new text;
  v_old text;
  v_name text;
begin
  v_new := public.compute_provider_level(p_id);
  select badge_level into v_old from public.profiles where id = p_id;

  if v_new is distinct from v_old then
    update public.profiles set badge_level = v_new where id = p_id;

    -- Notificar solo cuando OBTIENE u OBTIENE UN NIVEL MAYOR (no al bajar).
    if v_new is not null and public.badge_rank(v_new) > public.badge_rank(v_old) then
      v_name := case v_new
        when 'miembro'   then 'Miembro Verificado'
        when 'aliado'    then 'Aliado Destacado'
        when 'embajador' then 'Embajador Neuromundi'
        else v_new end;
      insert into public.notifications (user_id, type, title, body, data)
      values (
        p_id, 'badge',
        '¡Felicidades! Alcanzaste ' || v_name,
        'Tu perfil ahora muestra el distintivo ' || v_name ||
          '. Gracias por tu compromiso con la comunidad Neuromundi.',
        jsonb_build_object('level', v_new)
      );
    end if;
  end if;
  return v_new;
end;
$$;

revoke all on function public.compute_provider_level(uuid) from public, anon;
revoke all on function public.refresh_provider_badge(uuid) from public, anon;

-- Recalcula TODOS (para transiciones por tiempo). Programar a diario.
create or replace function public.refresh_all_badges()
returns integer language plpgsql security definer set search_path = public as $$
declare rec record; v_count integer := 0; v_before text; v_after text;
begin
  -- Permitido para cron (sin sesión) o para administradores.
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'not authorized';
  end if;
  for rec in select id, badge_level from public.profiles where role = 'provider' loop
    v_before := rec.badge_level;
    v_after := public.refresh_provider_badge(rec.id);
    if v_after is distinct from v_before then v_count := v_count + 1; end if;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.refresh_all_badges() from public, anon;
grant execute on function public.refresh_all_badges() to authenticated;

-- Disparo inmediato: cuando el admin aprueba/retira la validación documental.
create or replace function public.trg_profile_badge_on_verify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_verified is distinct from old.is_verified then
    perform public.refresh_provider_badge(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_badge_on_verify on public.profiles;
create trigger profiles_badge_on_verify
  after update of is_verified on public.profiles
  for each row execute function public.trg_profile_badge_on_verify();

-- ── Programación diaria (si tienes la extensión pg_cron) ─────────────────────
-- select cron.schedule('refresh-badges-daily', '0 6 * * *', $cron$ select public.refresh_all_badges(); $cron$);
-- Si no usas pg_cron, llama a refresh_all_badges() desde una tarea/Edge Function
-- programada una vez al día.
