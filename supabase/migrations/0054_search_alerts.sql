-- ============================================================================
-- 0054 — Alertas de búsqueda del directorio (aviso instantáneo)
--
-- La familia guarda una búsqueda (país + categoría, ciudad opcional) y recibe
-- aviso EN CUANTO se publica un especialista nuevo que coincide. El disparo es
-- instantáneo: un trigger sobre `profiles` cuando un prestador pasa a publicado.
--
-- Criterio de coincidencia (decidido con el usuario):
--   · país: igual (normalizado) o la alerta no fijó país;
--   · categoría: el prestador tiene esa categoría, o la alerta no fijó categoría;
--   · ciudad: igual (minúsculas) o la alerta no fijó ciudad.
--
-- Idempotente. Aplicar después de la 0053.
-- ============================================================================

create table if not exists public.search_alerts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  country     text,            -- nombre canónico (como profiles.country); null = cualquiera
  category_id integer references public.categories(id) on delete cascade,
  city        text,            -- opcional
  created_at  timestamptz not null default now()
);

create index if not exists idx_search_alerts_user on public.search_alerts (user_id);
create index if not exists idx_search_alerts_match on public.search_alerts (country, category_id);

alter table public.search_alerts enable row level security;

drop policy if exists search_alerts_own on public.search_alerts;
create policy search_alerts_own on public.search_alerts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── notif_category: clasifica el nuevo tipo (para las preferencias de push) ──
-- Se recrea incluyendo 'directory_match' en la categoría "comunidad".
create or replace function public.notif_category(p_type text)
returns text
language sql immutable set search_path = public as $$
  select case
    when p_type like 'appt_%' or p_type in ('booking_request', 'waitlist_slot') then 'citas'
    when p_type in ('direct_message', 'admin_message') then 'mensajes'
    when p_type in ('post_achievement', 'badge', 'waitlist_join', 'referral_use', 'referral_reward', 'directory_match') then 'comunidad'
    when p_type in ('commission_paid', 'donation_thanks') then 'transacciones'
    when p_type = 'campaign' then 'campanas'
    else 'otras'
  end;
$$;

-- ── Aviso instantáneo al publicarse un perfil de prestador ──────────────────
create or replace function public.tg_notify_search_alerts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  -- Solo prestadores, y solo en la TRANSICIÓN a publicado (no en cada guardado).
  if NEW.role <> 'provider' or NEW.is_published is not true then
    return NEW;
  end if;
  if TG_OP = 'UPDATE' and OLD.is_published is true then
    return NEW;  -- ya estaba publicado; no volver a avisar
  end if;

  v_name := coalesce(NEW.business_name, NEW.full_name, 'un especialista');

  insert into public.notifications (user_id, type, title, body, data)
  select sa.user_id,
         'directory_match',
         'Nuevo especialista para ti',
         format('%s coincide con una de tus búsquedas guardadas.', v_name),
         jsonb_build_object('provider_id', NEW.id, 'name', v_name)
    from public.search_alerts sa
   where sa.user_id <> NEW.id
     and (sa.country is null or public.normalize_country(sa.country) = public.normalize_country(NEW.country))
     and (sa.city is null or lower(btrim(sa.city)) = lower(btrim(coalesce(NEW.city, ''))))
     and (
       sa.category_id is null
       or exists (
         select 1 from public.provider_categories pc
         where pc.provider_id = NEW.id and pc.category_id = sa.category_id
       )
     );

  return NEW;
exception when others then
  -- Nunca bloquear la publicación del perfil por un fallo del aviso.
  return NEW;
end;
$$;

drop trigger if exists trg_notify_search_alerts on public.profiles;
create trigger trg_notify_search_alerts
  after insert or update of is_published on public.profiles
  for each row execute function public.tg_notify_search_alerts();
