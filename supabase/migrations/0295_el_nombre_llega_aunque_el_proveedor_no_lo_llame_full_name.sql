-- Google manda el nombre en `full_name` y en `name`. LinkedIn y Microsoft,
-- que siguen el estandar OIDC, mandan `name` o `given_name`+`family_name`.
-- El alta solo leia `full_name`, asi que por esas dos vias el perfil podia
-- nacer sin nombre. Este disparador lo completa a partir de lo que haya.
create or replace function public.nombre_desde_el_proveedor()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  m jsonb;
  n text;
begin
  if coalesce(new.full_name, '') <> '' then
    return new;
  end if;
  select coalesce(raw_user_meta_data, '{}'::jsonb) into m from auth.users where id = new.id;
  n := coalesce(
         nullif(m->>'full_name', ''),
         nullif(m->>'name', ''),
         nullif(btrim(coalesce(m->>'given_name', '') || ' ' || coalesce(m->>'family_name', '')), '')
       );
  if n is not null then
    new.full_name := n;
  end if;
  return new;
end;
$$;

create or replace trigger z_nombre_desde_el_proveedor
before insert on public.profiles
for each row execute function public.nombre_desde_el_proveedor();
