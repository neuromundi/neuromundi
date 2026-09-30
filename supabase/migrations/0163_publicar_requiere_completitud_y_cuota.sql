-- 0163: publicar exige perfil completo Y cuota cubierta (pagada o exenta).
-- Además evita el hueco: una ficha reclamada sigue visible mientras su
-- reclamante no esté publicado, para que nadie desaparezca del directorio.

-- 1) Requisitos -------------------------------------------------------------

create or replace function public.perfil_completo(p_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select coalesce(
       btrim(coalesce(p.avatar_url,'')) <> ''
   and btrim(coalesce(p.bio,''))        <> ''
   and btrim(coalesce(p.phone,''))      <> ''
   and btrim(coalesce(p.country,''))    <> '', false)
  from public.profiles p where p.id = p_id;
$$;

create or replace function public.cuota_cubierta(p_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select coalesce(
       p.membership_status in ('active','exempt')
    or (p.membership_paid_until is not null and p.membership_paid_until > now()), false)
  from public.profiles p where p.id = p_id;
$$;

-- cumple los dos requisitos, sin considerar la suspensión
create or replace function public.cumple_requisitos(p_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.perfil_completo(p_id) and public.cuota_cubierta(p_id);
$$;

create or replace function public.puede_publicar(p_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.cumple_requisitos(p_id)
     and coalesce((select p.suspended_at is null from public.profiles p where p.id = p_id), false);
$$;

-- 2) Estado para la interfaz -----------------------------------------------

create or replace function public.estado_publicacion(p_id uuid)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object(
    'completo',    public.perfil_completo(p_id),
    'faltantes',   (
        select coalesce(jsonb_agg(f), '[]'::jsonb) from (
          select 'foto'   as f from public.profiles p where p.id=p_id and btrim(coalesce(p.avatar_url,''))=''
          union all
          select 'descripcion' from public.profiles p where p.id=p_id and btrim(coalesce(p.bio,''))=''
          union all
          select 'telefono'    from public.profiles p where p.id=p_id and btrim(coalesce(p.phone,''))=''
          union all
          select 'pais'        from public.profiles p where p.id=p_id and btrim(coalesce(p.country,''))=''
        ) q),
    'cuota',       public.cuota_cubierta(p_id),
    'exento',      coalesce((select p.membership_status = 'exempt' from public.profiles p where p.id=p_id), false),
    'publicado',   coalesce((select p.is_published      from public.profiles p where p.id=p_id), false),
    'suspendido',  coalesce((select p.suspended_at is not null from public.profiles p where p.id=p_id), false),
    'puede',       public.puede_publicar(p_id)
  );
$$;

grant execute on function public.estado_publicacion(uuid) to authenticated;
grant execute on function public.puede_publicar(uuid)     to authenticated;

-- 3) Candado en la base: nadie publica sin cumplir --------------------------

create or replace function public.trg_gate_publicacion()
returns trigger language plpgsql set search_path to 'public' as $$
declare v_completo boolean; v_cuota boolean;
begin
  if new.is_published is not true then return new; end if;
  if tg_op = 'UPDATE' and coalesce(old.is_published,false) then return new; end if;

  v_completo :=     btrim(coalesce(new.avatar_url,'')) <> ''
                and btrim(coalesce(new.bio,''))        <> ''
                and btrim(coalesce(new.phone,''))      <> ''
                and btrim(coalesce(new.country,''))    <> '';

  v_cuota := new.membership_status in ('active','exempt')
          or (new.membership_paid_until is not null and new.membership_paid_until > now());

  if not (v_completo and v_cuota and new.suspended_at is null) then
    raise exception 'perfil_no_publicable'
      using errcode = 'check_violation',
            hint = 'Para publicar: completa tu perfil (foto, descripcion, telefono, pais) y cubre tu cuota.';
  end if;
  return new;
end $$;

drop trigger if exists gate_publicacion on public.profiles;
create trigger gate_publicacion
  before insert or update of is_published, avatar_url, bio, phone, country,
                             membership_status, membership_paid_until, suspended_at
  on public.profiles for each row execute function public.trg_gate_publicacion();

-- 4) Publicación automática cuando ya se cumple todo ------------------------

create or replace function public.publicar_si_procede(p_id uuid)
returns boolean language plpgsql security definer set search_path to 'public' as $$
begin
  update public.profiles
     set is_published = true
   where id = p_id
     and is_published = false
     and suspended_at is null
     and public.cumple_requisitos(p_id);
  return found;
end $$;

-- se conserva el nombre anterior como alias para el webhook ya desplegado
create or replace function public.publicar_por_pago(p_id uuid)
returns boolean language sql security definer set search_path to 'public' as $$
  select public.publicar_si_procede(p_id);
$$;

-- 5) Reclamo de ficha: publica solo si procede ------------------------------

create or replace function public.marcar_ficha_reclamada(p_token text, p_perfil uuid)
returns boolean language plpgsql security definer set search_path to 'public' as $$
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

  update public.profiles p
     set provider_type      = coalesce(p.provider_type, d.provider_type),
         profession         = coalesce(p.profession, d.profession),
         sections           = case when coalesce(array_length(p.sections, 1), 0) = 0
                                   then coalesce(d.sections, '{}') else p.sections end,
         neuro_conditions   = case when coalesce(array_length(p.neuro_conditions, 1), 0) = 0
                                   then coalesce(d.neuro_conditions, '{}') else p.neuro_conditions end,
         specialties        = case when coalesce(array_length(p.specialties, 1), 0) = 0
                                   then coalesce(d.specialties, '{}') else p.specialties end,
         intervention_areas = case when coalesce(array_length(p.intervention_areas, 1), 0) = 0
                                   then coalesce(d.intervention_areas, '{}') else p.intervention_areas end,
         product_categories = case when coalesce(array_length(p.product_categories, 1), 0) = 0
                                   then coalesce(d.product_categories, '{}') else p.product_categories end,
         services_offered   = coalesce(nullif(btrim(coalesce(p.services_offered, '')), ''), d.especializacion)
    from public.directorio d
   where d.id = v_ficha
     and p.id = p_perfil;

  perform public.publicar_si_procede(p_perfil);
  return true;
end $$;

-- 6) Reactivar tras suspensión: solo republica si cumple --------------------

create or replace function public.admin_member_reactivate(p_user uuid, p_nota text default null)
returns boolean language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_admin() then raise exception 'solo administradores'; end if;
  update public.profiles
     set suspended_at = null,
         suspend_until = null,
         winback_until = null,
         is_published = coalesce(pre_suspend_published, is_published)
                        and public.cumple_requisitos(p_user),
         pre_suspend_published = null
   where id = p_user;
  if not found then raise exception 'perfil no encontrado'; end if;
  perform public.admin_log_account_action(p_user, 'reactivate', p_nota);
  return true;
end $$;
