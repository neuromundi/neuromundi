-- 0223 — La exencion de las empresas se gana publicando una oferta real.
--
-- EL PROBLEMA. Registrarse como `company` concedia exencion de cuota
-- PERMANENTE, sin fecha y sin verificar nada: bastaba elegir esa tarjeta.
-- Contraste revelador: a una ONG se le exige documento aprobado para el
-- ASIENTO DE FUNDADOR, pero a nadie se le pedia nada para la EXENCION, que
-- vale mucho mas. La plataforma era mas estricta con una insignia que con el
-- dinero.
--
-- LA REGLA NUEVA. La exencion nace provisional y se confirma sola cuando la
-- empresa publica al menos una oferta activa de empleo, voluntariado o
-- servicio social. Se comprueba sin que nadie revise papeles, y mide
-- exactamente lo que la plataforma quiere fomentar.
--
--   dia 0-29   sin restriccion. Avisos a los 23 y 30 dias.
--   dia 30     deja de aparecer en el directorio. Conserva cuenta, datos,
--              acceso, mensajeria y Academy.
--   dia 45     ademas se le limitan mensajeria y Academy.
--   al publicar una oferta -> reactivacion TOTAL e inmediata, sin que nadie
--              del equipo tenga que intervenir.
--
-- NO SE COBRA NADA EN NINGUN MOMENTO. Una empresa que se registro de buena fe
-- y se distrajo no recibe un cargo sorpresa: pierde visibilidad, que se
-- recupera sola en cuanto publica.

alter table public.profiles
  add column if not exists empresa_plazo_desde timestamptz,
  add column if not exists empresa_limitada boolean not null default false;

comment on column public.profiles.empresa_plazo_desde is
  'Inicio del plazo para que una empresa publique su primera oferta. Columna protegida.';
comment on column public.profiles.empresa_limitada is
  'true a partir del dia 45 sin oferta: mensajeria y Academy limitadas. Columna protegida.';

-- Las empresas que ya existen arrancan su plazo hoy, no retroactivamente.
update public.profiles
   set empresa_plazo_desde = now()
 where provider_type = 'company' and empresa_plazo_desde is null;

-- ¿Tiene al menos una oferta viva?
create or replace function public.empresa_con_oferta(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (select 1 from public.job_openings j
                  where j.company_id = p_id and coalesce(j.is_active, false));
$fn$;

-- Estado actual, calculado. No escribe nada: sirve para que la pantalla sepa
-- que decir y cuantos dias quedan.
create or replace function public.empresa_estado(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare p public.profiles%rowtype; v_dias int; v_oferta boolean;
begin
  select * into p from public.profiles where id = p_id;
  if not found or p.provider_type <> 'company' then
    return jsonb_build_object('aplica', false);
  end if;
  v_oferta := public.empresa_con_oferta(p_id);
  v_dias := case when p.empresa_plazo_desde is null then 0
                 else floor(extract(epoch from (now() - p.empresa_plazo_desde)) / 86400)::int end;
  return jsonb_build_object(
    'aplica', true,
    'con_oferta', v_oferta,
    'dias', v_dias,
    'etapa', case when v_oferta then 'al_corriente'
                  when v_dias >= 45 then 'limitada'
                  when v_dias >= 30 then 'sin_directorio'
                  else 'provisional' end,
    'dias_para_directorio', greatest(0, 30 - v_dias),
    'dias_para_limite',     greatest(0, 45 - v_dias));
end;
$fn$;
grant execute on function public.empresa_estado(uuid) to authenticated;
grant execute on function public.empresa_con_oferta(uuid) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Reactivacion INMEDIATA al publicar. Sin intervencion de nadie.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.tg_empresa_reactivar_por_oferta()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare v_empresa uuid;
begin
  v_empresa := coalesce(NEW.company_id, OLD.company_id);
  if v_empresa is null or not coalesce(NEW.is_active, false) then return NEW; end if;

  -- Se levanta la limitacion y se reinicia el plazo: mientras tenga oferta
  -- viva no vuelve a correr, y si algun dia la retira, vuelve a empezar desde
  -- cero en lugar de caer de golpe.
  update public.profiles
     set empresa_limitada = false,
         empresa_plazo_desde = now()
   where id = v_empresa and provider_type = 'company'
     and (empresa_limitada or empresa_plazo_desde < now() - interval '1 minute');

  -- Y vuelve al directorio en el acto si cumple lo demas.
  perform public.publicar_si_procede(v_empresa);

  insert into public.notifications (user_id, type, title, body, data)
  select v_empresa, 'empresa_reactivada', 'Su empresa vuelve a estar visible',
         'Publicó una oferta y su perfil quedó activo otra vez en el directorio, con todas sus funciones.',
         jsonb_build_object('job_id', NEW.id)
  where exists (select 1 from public.profiles where id = v_empresa and provider_type = 'company');
  return NEW;
end;
$fn$;

drop trigger if exists trg_empresa_reactivar on public.job_openings;
create trigger trg_empresa_reactivar
  after insert or update on public.job_openings
  for each row execute function public.tg_empresa_reactivar_por_oferta();

-- ─────────────────────────────────────────────────────────────────────────
-- Aplicacion diaria de los plazos, con avisos previos.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.aplicar_plazos_empresa()
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare v_aviso int := 0; v_dir int := 0; v_lim int := 0; r record;
begin
  for r in
    select p.id, p.empresa_plazo_desde, p.is_published, p.empresa_limitada,
           floor(extract(epoch from (now() - p.empresa_plazo_desde)) / 86400)::int as dias
    from public.profiles p
    where p.provider_type = 'company'
      and p.empresa_plazo_desde is not null
      and not public.empresa_con_oferta(p.id)
  loop
    -- Aviso siete dias antes de cada escalon. La llave de idempotencia es el
    -- par (tipo, dia): el aviso de cada escalon sale UNA vez.
    if r.dias in (23, 38) and not exists (
         select 1 from public.notifications n
          where n.user_id = r.id and n.type = 'empresa_aviso'
            and (n.data->>'dia')::int = r.dias) then
      insert into public.notifications (user_id, type, title, body, data)
      values (r.id, 'empresa_aviso',
              case when r.dias = 23 then 'Le quedan 7 días para publicar su primera oferta'
                   else 'En 7 días se limitarán algunas funciones de su cuenta' end,
              case when r.dias = 23
                   then 'Su membresía es gratuita porque ofrece empleo, voluntariado o servicio social. Publique una oferta para conservar su lugar en el directorio.'
                   else 'Su perfil ya no aparece en el directorio. Si en 7 días no publica una oferta, también se limitarán la mensajería y Academy. Se reactiva todo en cuanto publique.' end,
              jsonb_build_object('dia', r.dias));
      v_aviso := v_aviso + 1;
    end if;

    if r.dias >= 30 and r.is_published then
      update public.profiles set is_published = false where id = r.id;
      insert into public.notifications (user_id, type, title, body, data)
      values (r.id, 'empresa_sin_directorio', 'Su perfil dejó de aparecer en el directorio',
              'Su cuenta, sus datos y su acceso siguen intactos. Publique una oferta de empleo, voluntariado o servicio social y volverá a aparecer de inmediato.',
              jsonb_build_object('dia', r.dias));
      v_dir := v_dir + 1;
    end if;

    if r.dias >= 45 and not r.empresa_limitada then
      update public.profiles set empresa_limitada = true where id = r.id;
      insert into public.notifications (user_id, type, title, body, data)
      values (r.id, 'empresa_limitada', 'Se limitaron algunas funciones de su cuenta',
              'Mensajería y Academy quedan limitadas hasta que publique una oferta. No hay ningún cargo: todo se reactiva solo al publicar.',
              jsonb_build_object('dia', r.dias));
      v_lim := v_lim + 1;
    end if;
  end loop;
  return jsonb_build_object('avisos', v_aviso, 'retiradas_del_directorio', v_dir, 'limitadas', v_lim);
end;
$fn$;
revoke all on function public.aplicar_plazos_empresa() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Las dos columnas nuevas son PROTEGIDAS: sin esto, una empresa se pondria
-- empresa_limitada = false y empresa_plazo_desde = now() en su propio perfil
-- con una peticion, y la regla no valdria nada.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare is_adm boolean; v_uid uuid; v_libre boolean;
begin
  v_uid := auth.uid();
  if v_uid is null then return new; end if;
  select (role = 'admin') into is_adm from public.profiles where id = v_uid;
  if coalesce(is_adm, false) then return new; end if;
  v_libre := coalesce(current_setting('app.perfil_privilegiado', true), '') = '1';

  new.role := old.role;
  new.rules_version_accepted := old.rules_version_accepted;
  new.is_verified := old.is_verified;
  new.is_advisor  := old.is_advisor;

  if not v_libre then
    new.sector                 := old.sector;
    new.membership_status      := old.membership_status;
    new.membership_due_at      := old.membership_due_at;
    new.membership_paid_until  := old.membership_paid_until;
    new.stripe_customer_id     := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.promo_code_used        := old.promo_code_used;
    new.referral_credit_pct    := old.referral_credit_pct;
    new.referred_by            := old.referred_by;
    new.referred_at            := old.referred_at;
    new.fundador_autorizado     := old.fundador_autorizado;
    new.fundador_autorizado_en  := old.fundador_autorizado_en;
    new.fundador_autorizado_por := old.fundador_autorizado_por;
    new.empresa_plazo_desde    := old.empresa_plazo_desde;
    new.empresa_limitada       := old.empresa_limitada;
    new.exencion_tipo          := old.exencion_tipo;
    new.exencion_folio         := old.exencion_folio;
    new.exencion_documento     := old.exencion_documento;
    new.exencion_solicitada_en := old.exencion_solicitada_en;
    new.exencion_aprobada_en   := old.exencion_aprobada_en;
    new.exencion_aprobada_por  := old.exencion_aprobada_por;
    new.exencion_vigente_hasta := old.exencion_vigente_hasta;
    new.exencion_rechazo       := old.exencion_rechazo;
    new.suspended_at           := old.suspended_at;
    new.suspend_until          := old.suspend_until;
    new.winback_until          := old.winback_until;
    new.pre_suspend_published  := old.pre_suspend_published;
  end if;
  return new;
end;
$fn$;
