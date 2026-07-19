-- ============================================================================
-- Número de registro (folio) del miembro.
-- ----------------------------------------------------------------------------
-- Asigna a cada perfil un número de registro secuencial y estable (member_no),
-- visible en el área de cuenta del usuario. Se genera automáticamente al crearse
-- el perfil (trigger handle_new_user inserta sin member_no y toma el default).
-- Idempotente.
-- ============================================================================

-- 1) Secuencia para el folio.
create sequence if not exists public.profiles_member_no_seq;

-- 2) Columna member_no con valor por defecto tomado de la secuencia.
alter table public.profiles
  add column if not exists member_no bigint;

alter table public.profiles
  alter column member_no set default nextval('public.profiles_member_no_seq');

-- 3) Backfill de perfiles existentes que aún no tengan folio (orden por antigüedad).
do $$
declare r record;
begin
  for r in
    select id from public.profiles where member_no is null order by created_at asc
  loop
    update public.profiles
      set member_no = nextval('public.profiles_member_no_seq')
      where id = r.id;
  end loop;
end $$;

-- 4) Unicidad e índice.
create unique index if not exists profiles_member_no_key on public.profiles (member_no);

-- Nota: el folio visible se muestra como "NM-000123" (member_no con relleno de
-- ceros) en el área de cuenta; el valor almacenado es el entero member_no.
