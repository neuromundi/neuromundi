-- 0330. Dos de cada tres fichas reclamadas se quedaban sin publicar, y las dos
-- siempre por lo mismo: foto y descripcion. Medido el 29 oct 2026 sobre los
-- tres reclamos reales de la campana, y confirmado con sus accesos: ninguno
-- de los tres volvio a entrar despues del dia que reclamo.
--
-- (a) La FOTO deja de ser requisito para publicar. Una clinica no siempre tiene
--     su logotipo a mano en ese momento, y las fichas del directorio ya
--     aparecen sin foto sin que estorbe. Sigue siendo recomendable, pero ya no
--     deja a nadie invisible.
-- (b) La DESCRIPCION se precarga al reclamar, como BORRADOR. bio_borrador lo
--     marca para que la pantalla lo diga y la persona lo revise: es texto
--     redactado por la plataforma, no suyo, y no puede presentarse como suyo
--     sin que lo sepa.

alter table public.profiles
  add column if not exists bio_borrador boolean not null default false;

comment on column public.profiles.bio_borrador is
  'true cuando la descripcion la precargo reclamar-ficha a partir de la ficha del directorio. La pantalla lo advierte y se pone en false en cuanto la persona la edita.';

create or replace function public.perfil_completo(p_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  -- La foto NO entra: ver el encabezado de la migracion 0330.
  select coalesce(
       btrim(coalesce(p.bio,''))     <> ''
   and btrim(coalesce(p.phone,''))   <> ''
   and btrim(coalesce(p.country,'')) <> '', false)
  from public.profiles p where p.id = p_id;
$function$;

create or replace function public.estado_publicacion(p_id uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
begin
  if p_id is distinct from auth.uid() and not public.is_admin() then
    raise exception 'solo el propio perfil';
  end if;
  return (
    select jsonb_build_object(
      'completo',    public.perfil_completo(p_id),
      'faltantes',   (
          select coalesce(jsonb_agg(f), '[]'::jsonb) from (
            select 'descripcion' as f from public.profiles p where p.id=p_id and btrim(coalesce(p.bio,''))=''
            union all
            select 'telefono'    from public.profiles p where p.id=p_id and btrim(coalesce(p.phone,''))=''
            union all
            select 'pais'        from public.profiles p where p.id=p_id and btrim(coalesce(p.country,''))=''
          ) q),
      'cuota',       public.cuota_cubierta(p_id),
      'exento',      coalesce((select p.membership_status = 'exempt' from public.profiles p where p.id=p_id), false),
      'publicado',   coalesce((select p.is_published      from public.profiles p where p.id=p_id), false),
      'suspendido',  coalesce((select p.suspended_at is not null from public.profiles p where p.id=p_id), false),
      'borrador',    coalesce((select p.bio_borrador      from public.profiles p where p.id=p_id), false),
      'puede',       public.puede_publicar(p_id)
    )
  );
end $function$;
