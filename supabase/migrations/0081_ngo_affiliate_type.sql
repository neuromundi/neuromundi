-- ============================================================================
-- Cuota específica para ONGs: nuevo affiliate_type 'ngo'.
-- ----------------------------------------------------------------------------
-- · Se agrega al constraint de membership_fees.
-- · Se siembra INACTIVA con base_usd=0: el admin la activa y fija el monto
--   real desde el panel (AdminBilling → useAdminBilling). Mientras esté
--   inactiva, membership_price_for() no encuentra precio y el modal de pago
--   no ofrece cobrar por error un monto no decidido por el negocio.
-- · affiliate_type_for(): 'ngo' (provider_type de KProviderRegister) caía en
--   el bucket 'nonmedical_specialist' porque solo pasaban directo
--   'merchant' | 'school' | 'clinic'. Se agrega 'ngo' a ese passthrough para
--   que tenga su propia cuota en vez de pagar la de especialista.
-- ============================================================================

alter table public.membership_fees drop constraint if exists membership_fees_affiliate_type_check;
alter table public.membership_fees
  add constraint membership_fees_affiliate_type_check
  check (affiliate_type in (
    'patient', 'parent',
    'medical_specialist', 'nonmedical_specialist',
    'service_provider', 'merchant', 'school', 'clinic', 'ngo'
  ));

insert into public.membership_fees (affiliate_type, base_usd, is_active)
values ('ngo', 0.00, false)
on conflict (affiliate_type) do nothing;

create or replace function public.affiliate_type_for(p_user uuid)
returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_role text; v_ptype text; v_prof text; v_override boolean; v_medical boolean;
begin
  select p.role, p.provider_type, p.profession, p.is_medical_override
    into v_role, v_ptype, v_prof, v_override
  from public.profiles p where p.id = p_user;

  if v_role is distinct from 'provider' then
    return coalesce(v_role, 'parent');
  end if;

  if v_ptype in ('merchant', 'school', 'clinic', 'ngo') then
    return v_ptype;
  end if;

  v_medical := coalesce(v_override, public.is_medical_profession(v_prof));
  if v_medical is true then
    return 'medical_specialist';
  end if;
  return 'nonmedical_specialist';
end; $$;
grant execute on function public.affiliate_type_for(uuid) to authenticated, service_role;
