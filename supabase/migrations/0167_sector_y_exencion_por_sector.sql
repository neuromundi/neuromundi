-- 0167: el sector viaja de la ficha al perfil y determina la exención.
-- Las entidades públicas y las organizaciones del sector social no pagan cuota.
-- Ser ONG NO basta por sí solo: una A.C. del sector privado paga como cualquiera.
-- Las empresas inclusivas siguen exentas por tipo de perfil.

alter table public.profiles
  add column if not exists sector text
  check (sector is null or sector in ('publico','social','privado'));

comment on column public.profiles.sector is
  'publico | social | privado. Heredado de la ficha al reclamarla o asignado por el administrador. Determina la exención de cuota junto con provider_type.';

create or replace function public.exento_de_cuota(p_sector text, p_provider_type text)
returns boolean language sql immutable as $$
  select coalesce(p_sector in ('publico','social') or p_provider_type = 'company', false);
$$;

-- El disparador que exentaba solo a las empresas ahora mira también el sector.
create or replace function public.tg_company_membership_free()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if public.exento_de_cuota(NEW.sector, NEW.provider_type) then
    NEW.membership_status := 'exempt';
  end if;
  return NEW;
end; $$;

-- Al reclamar, el perfil hereda el sector de su ficha.
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
         sector             = coalesce(p.sector, d.sector),
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

-- La cotización de una ficha exenta debe verse en cero también en la campaña.
create or replace function public.ficha_exenta(p_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select coalesce(public.exento_de_cuota(d.sector, d.provider_type), false)
  from public.directorio d where d.id = p_id;
$$;

grant execute on function public.exento_de_cuota(text, text) to authenticated, anon;
grant execute on function public.ficha_exenta(uuid) to authenticated, anon;
