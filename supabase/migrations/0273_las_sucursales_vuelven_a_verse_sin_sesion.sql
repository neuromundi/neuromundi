-- 0273: las sucursales de un prestador vuelven a ser legibles sin sesion.
--
-- Medido el 18 de octubre de 2026 contra la API publica con la llave anonima:
-- cualquier lectura de `provider_locations` respondia 401 con el error 42501,
-- "permission denied for table profiles". Ningun visitante sin sesion podia
-- leer las sucursales, y el mapa del directorio las perdia todas.
--
-- Causa: la politica `locations_select_public` resolvia "¿este prestador esta
-- publicado?" leyendo `profiles` directamente. La expresion de una politica se
-- evalua con los permisos de QUIEN consulta, y el rol anonimo no tiene permiso
-- de lectura sobre `profiles` (ni debe tenerlo). La consulta moria entera.
--
-- El fallo era SILENCIOSO: el hook solo lo escribia en la consola del navegador
-- ("No se pudieron cargar ubicaciones del mapa") y el mapa se pintaba sin esas
-- marcas, como si el prestador no tuviera sucursales.
--
-- La solucion es la que ya usa `is_member_active` en esta misma base: una
-- funcion SECURITY DEFINER que responde un booleano. No expone ni una columna
-- de `profiles`; solo contesta si ese identificador corresponde a un perfil
-- publicado y con membresia vigente, que es informacion que el directorio
-- publico ya muestra. La politica conserva exactamente la misma semantica.
--
-- Verificado de las dos maneras, con filas reales que despues se borraron:
--   · sucursal de un perfil PUBLICADO    -> la ve el visitante anonimo;
--   · sucursal de un perfil NO publicado -> no la ve (2 filas en la tabla, 1 devuelta).

create or replace function public.perfil_publicado_y_vigente(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_id
      and p.is_published = true
      and public.is_member_active(p.id)
  );
$$;

comment on function public.perfil_publicado_y_vigente(uuid) is
  'Responde si un perfil esta publicado y con membresia vigente, sin exponer profiles. La usan politicas RLS que debe poder evaluar el visitante anonimo.';

revoke all on function public.perfil_publicado_y_vigente(uuid) from public;
grant execute on function public.perfil_publicado_y_vigente(uuid) to anon, authenticated;

alter policy locations_select_public on public.provider_locations
  using (
    public.perfil_publicado_y_vigente(provider_id)
    or provider_id = (select auth.uid())
  );
