-- 0191: Familias/pacientes fundadores ya NO requieren teléfono.
-- Objetivo: foto + bio (y correo verificado, implícito en la cuenta).
-- Perfiles de pago y empresas mantienen sus requisitos.
create or replace function public.purge_lapsed_founders()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_count integer;
begin
  with lapsed as (
    delete from public.founder_members fm
    using public.profiles p
    where fm.user_id = p.id
      and fm.grace_until is not null
      and fm.grace_until < now()
      and not (
        case
          when fm.kind = 'companies' then
            (select count(*) from public.job_openings j where j.company_id = p.id and j.is_active = true) >= 2
          when fm.kind = 'families' then
            -- Familias/pacientes: solo foto + biografía (sin teléfono).
            p.avatar_url is not null
            and coalesce(p.bio, '') <> ''
          else
            -- Perfiles de pago: foto + bio + teléfono + cuota cubierta.
            p.avatar_url is not null
            and coalesce(p.bio, '') <> ''
            and coalesce(p.phone, '') <> ''
            and (
              p.membership_status in ('active', 'exempt')
              or (p.membership_paid_until is not null and p.membership_paid_until > now())
            )
        end
      )
    returning fm.user_id
  )
  select count(*) into v_count from lapsed;
  return v_count;
end;
$function$;
