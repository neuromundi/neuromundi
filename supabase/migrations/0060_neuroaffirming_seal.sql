-- ============================================================================
-- 0060 — Sello Neuromundi Neuroafirmativo
--
-- Distintivo que identifica a los proveedores validados como NEUROAFIRMATIVOS
-- (flexibles, empáticos y sensorialmente adaptados). Lo concede SOLO el
-- administrador, igual que `is_verified` / `is_published` (no hay UI de
-- autoservicio). Se usa como filtro en el directorio y como sello en el perfil.
--
-- Las dimensiones que sustentan el sello (adaptación sensorial, flexibilidad y
-- trato humano) YA se capturan en `satisfaction_surveys` y se promedian en la
-- vista pública `public_provider_ratings`; esta migración solo añade la marca
-- curada por el admin. Idempotente. Aplicar después de la 0059.
-- ============================================================================

-- 1) Marca en el perfil (por defecto apagada).
alter table public.profiles
  add column if not exists neuroaffirming boolean not null default false;

-- Índice parcial: el directorio filtra "solo neuroafirmativos".
create index if not exists idx_profiles_neuroaffirming
  on public.profiles(neuroaffirming) where neuroaffirming;

-- 2) Otorgar/retirar el sello (solo admin, solo proveedores).
create or replace function public.admin_set_neuroaffirming(p_id uuid, p_value boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;
  update public.profiles
     set neuroaffirming = p_value
   where id = p_id and role = 'provider';
end;
$$;

grant execute on function public.admin_set_neuroaffirming(uuid, boolean) to authenticated;
