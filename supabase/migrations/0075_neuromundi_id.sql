-- 0075_neuromundi_id.sql
-- Neuromundi ID (Fase 1) — evoluciona el QR simple a una identidad de comunidad.
--   1) Prestadores pueden declarar que aceptan la Neuromundi ID (opt-in), lo que
--      se muestra como leyenda en su perfil público (prueba social).
--   2) La validación al escanear devuelve rol, folio y estado de la cuenta para
--      una "pantalla verde" clara (nombre, rol, folio, vigencia).
-- Idempotente.

alter table public.profiles
  add column if not exists accepts_neuromundi_id boolean not null default false;

-- resolve_parent_by_qr: además de id y nombre, devuelve rol, folio y si la cuenta
-- está suspendida (para mostrar vigencia). Cambia el tipo de retorno → DROP antes.
drop function if exists public.resolve_parent_by_qr(uuid, uuid);
create or replace function public.resolve_parent_by_qr(p_id uuid, p_token uuid)
returns table (id uuid, full_name text, role text, member_no bigint, suspended boolean)
language plpgsql security definer set search_path = public as $$
begin
  return query
  select pr.id, pr.full_name, pr.role, pr.member_no, (pr.suspended_at is not null)
  from public.profiles pr
  where pr.id = p_id
    and pr.qr_token = p_token
    and pr.role in ('parent', 'patient');
end; $$;
grant execute on function public.resolve_parent_by_qr(uuid, uuid) to authenticated;
