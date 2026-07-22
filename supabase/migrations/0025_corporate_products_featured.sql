-- ============================================================================
-- Tienda corporativa: los productos creados por el ADMIN se aprueban solos y
-- quedan DESTACADOS (para que aparezcan resaltados en la tienda de la plataforma).
-- Reemplaza el trigger de autoaprobación de 0010_store.sql. Idempotente.
-- ============================================================================

create or replace function public.trg_products_admin_autoapprove()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then
    new.status := 'approved';
    new.is_featured := true;   -- producto corporativo destacado
  end if;
  return new;
end;
$$;

-- El trigger ya existe (0010); esto solo actualiza la función.
