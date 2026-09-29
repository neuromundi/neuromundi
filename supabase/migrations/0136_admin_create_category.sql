-- ============================================================================
-- 0136 — Promover sugerencia a categoría real del directorio
--
-- Alta de una categoría curada (tabla `categories`) desde la cola de sugerencias
-- del admin. Solo el admin. slug único: si ya existe, no duplica. sort_order al
-- final. El `name` es el respaldo en español; la localización cat.<slug> se
-- añade luego en i18n (mientras tanto catLabel cae al name, no a la clave cruda).
--
-- Nota de alcance: solo el directorio tiene su taxonomía en BD. Las categorías de
-- la TIENDA (STORE_CATEGORIES) viven en código y los PRODUCTOS los publica el
-- prestador, así que esos no se "crean" desde aquí (el front copia el fragmento
-- listo para pegar).
--
-- Idempotente.
-- ============================================================================

create or replace function public.admin_create_category(p_slug text, p_name text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Solo el administrador';
  end if;
  if btrim(coalesce(p_slug, '')) = '' or btrim(coalesce(p_name, '')) = '' then
    raise exception 'slug y nombre son obligatorios';
  end if;
  insert into public.categories (slug, name, sort_order)
  values (
    lower(btrim(p_slug)),
    left(btrim(p_name), 120),
    coalesce((select max(sort_order) from public.categories), 0) + 1
  )
  on conflict (slug) do nothing;
end;
$$;
grant execute on function public.admin_create_category(text, text) to authenticated;
