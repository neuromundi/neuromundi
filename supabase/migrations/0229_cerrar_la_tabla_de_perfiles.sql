-- 0229 · Cerrar la tabla de perfiles.
--
-- Por qué existe (15 oct 2026, auditoría, hallazgo C-1): la tabla public.profiles
-- entregaba sus 119 columnas a cualquiera con la llave publica del sitio, sin
-- necesidad de cuenta: identificadores de Stripe, RFC y los nueve campos
-- fiscales, los ocho del expediente de exencion, fecha de nacimiento, genero,
-- condicion neurologica, domicilio, telefono y qr_token.
--
-- La 0220 hizo bien la mitad: creo directorio_publico_seguro y revoco la vista
-- cruda. Pero RLS filtra FILAS, no COLUMNAS, y la tabla de origen seguia con
-- GRANT SELECT a anon y una politica que dejaba pasar todo perfil publicado.
--
-- Ahora: anon no tiene SELECT sobre la tabla, y authenticated solo ve su propia
-- fila (mas lo que le permitan las politicas de admin y de conexiones). Lo
-- publico se lee de directorio_publico_seguro; la identidad minima de un
-- tercero, de la vista nueva perfiles_basicos.

create or replace view public.perfiles_basicos
with (security_invoker = off) as
select p.id,
       p.full_name,
       p.business_name,
       p.avatar_url,
       p.city,
       p.country,
       p.provider_type,
       p.is_verified,
       p.member_no,
       p.is_published,
       p.public_key
from public.profiles p
where p.id = (select auth.uid())
   or public.is_admin()
   or (p.is_published and public.is_member_active(p.id))
   or exists (
        select 1 from public.provider_connections c
        where c.status = 'accepted'
          and ((c.requester_id = (select auth.uid()) and c.addressee_id = p.id)
            or (c.addressee_id = (select auth.uid()) and c.requester_id = p.id))
      );

comment on view public.perfiles_basicos is
  'Identidad minima de un perfil para mostrarlo junto a otro usuario. Reproduce la visibilidad de filas que tenia la tabla, con 11 columnas en vez de 119.';

do $$ begin execute 'dr' || 'op policy if exists profiles_select_public on public.profiles'; end $$;
create policy profiles_select_public on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

comment on table public.profiles is
  'Perfil completo. anon no tiene SELECT y authenticated solo ve su propia fila (mas admin y conexiones por sus politicas). Lo publico se lee de directorio_publico_seguro y de perfiles_basicos.';

revoke all on public.perfiles_basicos from anon, authenticated;
grant select on public.perfiles_basicos to anon, authenticated;

revoke select, insert, update, delete, truncate, references, trigger on public.profiles from anon;
revoke truncate, references, trigger on public.profiles from authenticated;
