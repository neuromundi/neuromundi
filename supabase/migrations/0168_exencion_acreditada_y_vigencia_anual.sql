-- 0168: la exención deja de ser una etiqueta y pasa a ser un expediente.
--
-- Público y empresa inclusiva: exención permanente, se acredita por lo que son.
-- Sector social: exención de UN AÑO. Para renovarla hay que volver a comprobar
-- que se sigue siendo donataria autorizada del SAT o que sigue vigente la CLUNI.
-- Las fichas precargadas entran con un año provisional desde que se reclaman,
-- así nadie queda fuera durante la campaña pero nadie queda exento para siempre
-- sin haberlo comprobado.

alter table public.profiles
  add column if not exists exencion_tipo text,
  add column if not exists exencion_folio text,
  add column if not exists exencion_documento text,
  add column if not exists exencion_solicitada_en timestamptz,
  add column if not exists exencion_aprobada_en timestamptz,
  add column if not exists exencion_aprobada_por uuid,
  add column if not exists exencion_vigente_hasta timestamptz,
  add column if not exists exencion_rechazo text;

do $$ begin
  alter table public.profiles add constraint profiles_exencion_tipo_check
    check (exencion_tipo is null or exencion_tipo in ('publico','donataria','cluni','empresa'));
exception when duplicate_object then null; end $$;

comment on column public.profiles.exencion_vigente_hasta is
  'Nulo = exención permanente (entidad pública o empresa inclusiva). Con fecha = hay que reacreditar antes de que venza.';

alter table public.account_actions drop constraint if exists account_actions_action_check;
alter table public.account_actions add constraint account_actions_action_check
  check (action in ('cancel','suspend','reactivate','winback_costo','exempt','unexempt','extend',
                    'exencion_solicitada','exencion_aprobada','exencion_rechazada'));

-- 1) La cuota cubierta por exención caduca ---------------------------------

create or replace function public.cuota_cubierta(p_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select coalesce(
       p.membership_status = 'active'
    or (p.membership_status = 'exempt'
        and (p.exencion_vigente_hasta is null or p.exencion_vigente_hasta > now()))
    or (p.membership_paid_until is not null and p.membership_paid_until > now()), false)
  from public.profiles p where p.id = p_id;
$$;

-- 2) Al nacer la exención se fija su tipo y su vigencia ---------------------

create or replace function public.tg_company_membership_free()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if not public.exento_de_cuota(NEW.sector, NEW.provider_type) then
    return NEW;
  end if;
  NEW.membership_status := 'exempt';
  if NEW.exencion_tipo is null then
    if NEW.provider_type = 'company' then
      NEW.exencion_tipo := 'empresa';
      NEW.exencion_vigente_hasta := null;
    elsif NEW.sector = 'publico' then
      NEW.exencion_tipo := 'publico';
      NEW.exencion_vigente_hasta := null;
    else
      NEW.exencion_vigente_hasta := coalesce(NEW.exencion_vigente_hasta, now() + interval '1 year');
    end if;
  end if;
  return NEW;
end; $$;

-- 3) El miembro solicita o renueva (versión final en 0169, con la bandera) ---

create or replace function public.solicitar_exencion(
  p_tipo text, p_folio text, p_documento text)
returns boolean language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null then raise exception 'sesion requerida'; end if;
  if p_tipo not in ('publico','donataria','cluni') then
    raise exception 'tipo de exencion no valido';
  end if;
  if btrim(coalesce(p_folio,'')) = '' then
    raise exception 'falta el RFC o la CLUNI';
  end if;

  update public.profiles
     set exencion_tipo = p_tipo,
         exencion_folio = btrim(p_folio),
         exencion_documento = nullif(btrim(coalesce(p_documento,'')), ''),
         exencion_solicitada_en = now(),
         exencion_aprobada_en = null,
         exencion_aprobada_por = null,
         exencion_rechazo = null
   where id = auth.uid();
  if not found then raise exception 'perfil no encontrado'; end if;

  perform public.admin_log_account_action(auth.uid(), 'exencion_solicitada', p_tipo || ' ' || btrim(p_folio));
  return true;
end $$;

grant execute on function public.solicitar_exencion(text, text, text) to authenticated;

-- 4) El administrador resuelve ---------------------------------------------

create or replace function public.admin_exencion_resolver(
  p_user uuid, p_aprobar boolean, p_nota text default null, p_meses int default 12)
returns boolean language plpgsql security definer set search_path to 'public' as $$
declare v_tipo text;
begin
  if not public.is_admin() then raise exception 'solo administradores'; end if;
  select exencion_tipo into v_tipo from public.profiles where id = p_user;
  if v_tipo is null then raise exception 'ese perfil no tiene solicitud de exencion'; end if;

  if p_aprobar then
    update public.profiles
       set membership_status = 'exempt',
           exencion_aprobada_en = now(),
           exencion_aprobada_por = auth.uid(),
           exencion_rechazo = null,
           exencion_vigente_hasta = case when v_tipo in ('publico','empresa') then null
                                         else now() + make_interval(months => greatest(1, p_meses)) end
     where id = p_user;
    perform public.admin_log_account_action(p_user, 'exencion_aprobada', p_nota);
  else
    update public.profiles
       set membership_status = case when membership_status = 'exempt' then 'pending' else membership_status end,
           exencion_aprobada_en = null,
           exencion_aprobada_por = null,
           exencion_vigente_hasta = now(),
           exencion_rechazo = nullif(btrim(coalesce(p_nota,'')), '')
     where id = p_user;
    perform public.admin_log_account_action(p_user, 'exencion_rechazada', p_nota);
  end if;
  return true;
end $$;

-- 5) Estado de la exención para la interfaz --------------------------------

create or replace function public.estado_exencion(p_id uuid)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object(
    'aplica',     coalesce(public.exento_de_cuota(p.sector, p.provider_type), false),
    'sector',     p.sector,
    'tipo',       p.exencion_tipo,
    'folio',      p.exencion_folio,
    'documento',  p.exencion_documento,
    'solicitada', p.exencion_solicitada_en,
    'aprobada',   p.exencion_aprobada_en,
    'vence',      p.exencion_vigente_hasta,
    'vencida',    (p.exencion_vigente_hasta is not null and p.exencion_vigente_hasta <= now()),
    'permanente', (p.exencion_tipo in ('publico','empresa')),
    'rechazo',    p.exencion_rechazo,
    'dias',       case when p.exencion_vigente_hasta is null then null
                       else greatest(0, (date_part('day', p.exencion_vigente_hasta - now()))::int) end
  ) from public.profiles p where p.id = p_id;
$$;

grant execute on function public.estado_exencion(uuid) to authenticated;
