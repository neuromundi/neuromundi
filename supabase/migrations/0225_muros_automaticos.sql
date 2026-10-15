-- 0225 — Los muros se publican solos. Sin paso manual.
--
-- EL PROBLEMA, visto en el primer pago real (15 oct 2026). Alguien paga su
-- cuota, queda como Miembro Fundador, dona y marca la casilla de aparecer en
-- el muro... y no aparece en ninguno de los dos. Ambos exigian que un
-- administrador encendiera a mano una marca que nace apagada, y nadie se lo
-- decia a la persona: ni confirmacion, ni aviso de que estaba en revision.
--
-- Decision de Enyoria: publicacion AUTOMATICA. Un muro que depende de que
-- alguien se acuerde de aprobar cada fila genera reclamos de gente que pago,
-- dio su consentimiento y no se ve.
--
-- QUE SE EXPONE EN CADA MURO, y por que esto es seguro:
--   · Muro de fundadores: nombre o razon social del PERFIL, numero de miembro,
--     tipo y pais. Nada escrito libremente. Riesgo nulo.
--   · Muro de donantes: el nombre, el nivel y la fecha. El unico texto libre
--     que aporta el donante es `publish_as`, el nombre con el que desea
--     aparecer. La nota y el logotipo del muro los pone el administrador, no
--     el donante.
--
-- El administrador conserva el control de RETIRAR: las pantallas de admin
-- siguen pudiendo apagar wall_published en cualquier momento.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Fundadores: el asiento entra publicado
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.grant_founder_seat(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
declare v_kind text; v_country text; v_usados int; v_auth boolean;
begin
  if exists (select 1 from public.founder_members where user_id = p_id) then return true; end if;
  if not public.founder_eligible(p_id) then return false; end if;
  v_kind := public.founder_kind_for(p_id);
  if v_kind is null then return false; end if;
  select p.country, coalesce(p.fundador_autorizado, false)
    into v_country, v_auth from public.profiles p where p.id = p_id;
  if not coalesce(v_auth, false) then
    select count(*) into v_usados
    from public.founder_members fm join public.profiles p on p.id = fm.user_id
    where fm.kind = v_kind and coalesce(p.is_internal,false) = false and p.country = v_country;
    if v_usados >= public.founder_cap_for(v_country, v_kind) then return false; end if;
  end if;
  -- wall_published en true desde el inicio: el muro de fundadores solo muestra
  -- datos del propio perfil, asi que no hay nada que moderar.
  insert into public.founder_members (user_id, kind, country, grace_until, wall_published)
  values (p_id, v_kind, v_country, null, true) on conflict (user_id) do nothing;

  insert into public.notifications (user_id, type, title, body, data)
  values (p_id, 'founder_wall', 'Ya aparece en el muro de Miembros Fundadores',
          'Su asiento quedó registrado y su nombre ya es visible en el muro de fundadores.',
          jsonb_build_object('url', '/fundadores'));
  return true;
end;
$fn$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Donantes: al pagar, y si dio su consentimiento, al muro
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.tg_donante_al_muro()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if NEW.status <> 'paid' or not coalesce(NEW.publish_consent, false) then
    return NEW;
  end if;
  -- Solo en la transicion a pagado, y sin pisar una retirada manual del admin
  -- (si ya estaba pagada y el admin la quito, no se vuelve a encender).
  if TG_OP = 'UPDATE' and OLD.status = 'paid' then
    return NEW;
  end if;
  NEW.wall_published := true;

  if NEW.donor_user_id is not null then
    insert into public.notifications (user_id, type, title, body, data)
    values (NEW.donor_user_id, 'donor_wall', 'Ya aparece en el muro de donantes',
            'Gracias por su donativo. Como pidió aparecer, su nombre ya es visible en el muro.',
            jsonb_build_object('url', '/donantes'));
  end if;
  return NEW;
end;
$fn$;

drop trigger if exists trg_donante_al_muro on public.donations;
create trigger trg_donante_al_muro
  before insert or update on public.donations
  for each row execute function public.tg_donante_al_muro();

-- ─────────────────────────────────────────────────────────────────────────
-- 3. El rezago: quien ya pago y ya consintio, al muro ahora
-- ─────────────────────────────────────────────────────────────────────────
update public.founder_members set wall_published = true where wall_published = false;

update public.donations
   set wall_published = true
 where status = 'paid' and coalesce(publish_consent, false) and wall_published = false;
