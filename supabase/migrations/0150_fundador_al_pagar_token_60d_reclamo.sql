-- ============================================================================
-- 0150 · Asiento de fundador al pagar · token de 60 días · el reclamo copia
--        el tipo de la ficha al perfil
--
-- Tres cambios que van juntos porque los tres afectan lo que se le cobra a un
-- invitado respecto de lo que su correo le prometió.
--
-- 1. ASIENTO DE FUNDADOR AL PAGAR, NO AL ENTRAR
--
--    Antes: `useFounderAutoClaim` llamaba a `claim_founder_slot()` en cuanto el
--    usuario entraba, y el checkout elegía el precio con `is_founder()`. O sea
--    que el asiento se ocupaba sin pagar y quedaba bloqueado 3 meses
--    (grace_until), mientras que quien NO alcanzaba asiento veía el precio
--    ordinario — el doble del que promete el correo.
--
--    Ahora: el precio se decide por ELEGIBILIDAD (`founder_eligible`), no por
--    tenencia. El asiento se otorga en el webhook de Stripe, tras el pago, con
--    `grant_founder_seat()`.
--
-- 2. TOKEN DE INVITACIÓN: 90 → 60 DÍAS, CONTADOS DESDE EL ENVÍO
--
--    Antes se contaban desde la creación de la fila. Hay 377 invitaciones
--    creadas entre el 8 y el 30 de septiembre y NINGUNA enviada: con 90 días no
--    se notaba, con 60 sí. Una creada el 8 de septiembre que saliera con la
--    tanda 4 llegaría con la mitad de su vida gastada sin que nadie la viera.
--
-- 3. EL RECLAMO COPIA `provider_type` Y `profession` DE LA FICHA AL PERFIL
--
--    El correo cotiza con los datos de la ficha y el cobro usa los del perfil.
--    Las funciones de clasificación son idénticas, pero nadie llenaba la
--    entrada, así que el precio podía divergir en cualquier dirección.
--
-- Idempotente. NO envía nada.
-- ============================================================================

-- ── 1. Elegibilidad de fundador ─────────────────────────────────────────────
-- Cupo del perfil, con la misma regla que founderKindFor() en TypeScript:
-- merchant → 'providers'; cualquier otro proveedor → 'professionals'.
create or replace function public.founder_kind_for(p_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when p.role in ('parent','patient') then 'families'
    when p.role = 'provider' and p.provider_type = 'company' then 'companies'
    when p.role = 'provider' and p.provider_type = 'merchant' then 'providers'
    when p.role = 'provider' then 'professionals'
    else null
  end
  from public.profiles p where p.id = p_id;
$$;

-- ¿Le corresponde tarifa de fundador AUNQUE todavía no tenga asiento?
-- Sí cuando: no se dio de baja del programa, su cupo tiene lugar, y el plazo de
-- fundador de su país no ha vencido. Quien ya es fundador siempre es elegible.
create or replace function public.founder_eligible(p_id uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_kind text; v_country text; v_wants boolean; v_usados int; v_limite timestamptz;
begin
  if exists (select 1 from public.founder_members where user_id = p_id) then
    return true;
  end if;

  select p.country, p.wants_founder into v_country, v_wants
  from public.profiles p where p.id = p_id;

  if v_wants is false then return false; end if;

  v_kind := public.founder_kind_for(p_id);
  if v_kind is null then return false; end if;

  -- Plazo por país. Sin país no hay plazo que evaluar: no es elegible.
  -- (El formulario exige el país antes de dejar continuar.)
  if coalesce(v_country,'') = '' then return false; end if;

  select (value #>> '{}')::timestamptz into v_limite
  from public.campaign_config c, jsonb_each(c.founder_deadline_by_country)
  where c.id = 1 and key = v_country;

  if v_limite is not null and now() >= v_limite then return false; end if;

  select count(*) into v_usados from public.founder_members where kind = v_kind;
  return v_usados < public.founder_capacity(v_kind);
end $$;

-- Otorga el asiento tras el pago. La llama el webhook de Stripe.
create or replace function public.grant_founder_seat(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_kind text; v_country text; v_usados int;
begin
  if exists (select 1 from public.founder_members where user_id = p_id) then
    return true;
  end if;

  v_kind := public.founder_kind_for(p_id);
  if v_kind is null then return false; end if;

  select p.country into v_country from public.profiles p where p.id = p_id;

  select count(*) into v_usados from public.founder_members where kind = v_kind;
  if v_usados >= public.founder_capacity(v_kind) then return false; end if;

  insert into public.founder_members (user_id, kind, country, grace_until)
  values (p_id, v_kind, v_country, now() + interval '3 months')
  on conflict (user_id) do nothing;
  return true;
end $$;

revoke all on function public.grant_founder_seat(uuid) from public, anon, authenticated;

-- ── 2. Token de invitación: 60 días desde el ENVÍO ──────────────────────────
alter table public.directorio_invitaciones
  alter column expira_en set default (now() + interval '60 days');

-- Las creadas y aún no enviadas se recalculan: ninguna se ha enviado.
update public.directorio_invitaciones
   set expira_en = creada_en + interval '60 days'
 where enviada_en is null
   and expira_en <> creada_en + interval '60 days';

-- Al marcar el envío, el reloj arranca de cero.
create or replace function public.directorio_invitacion_enviada(p_token text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  update public.directorio_invitaciones
     set enviada_en = now(),
         expira_en  = now() + interval '60 days'
   where token = p_token
     and enviada_en is null and cancelada_en is null
     and usada_en is null and baja_en is null;
  get diagnostics v_n = row_count;
  return v_n > 0;
end $$;

-- ── 3. El reclamo copia el tipo de la ficha al perfil ───────────────────────
-- Sólo cuando el perfil no lo tiene: no se sobreescribe lo que la persona
-- declaró por su cuenta.
create or replace function public.marcar_ficha_reclamada(p_token text, p_perfil uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_ficha uuid;
begin
  select i.directorio_id into v_ficha
  from public.directorio_invitaciones i
  where i.token = p_token
    and i.usada_en is null
    and i.baja_en is null
    and i.cancelada_en is null
    and i.expira_en > now();

  if v_ficha is null then return false; end if;

  update public.directorio
     set reclamada_por = p_perfil, reclamada_en = now(), actualizada_en = now()
   where id = v_ficha;

  update public.directorio_invitaciones set usada_en = now() where token = p_token;

  -- El precio que prometió el correo se calculó con estos dos campos de la
  -- ficha; el cobro los lee del perfil. Si el perfil viene vacío, se copian
  -- para que ambos caminos den el mismo tipo de afiliado y el mismo precio.
  update public.profiles p
     set provider_type = coalesce(p.provider_type, d.provider_type),
         profession    = coalesce(p.profession,    d.profession)
    from public.directorio d
   where d.id = v_ficha
     and p.id = p_perfil
     and (p.provider_type is null or p.profession is null);

  return true;
end $$;
