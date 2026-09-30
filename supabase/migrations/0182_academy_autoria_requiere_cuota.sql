-- ============================================================================
-- 0182 — Publicar cursos en Academy exige CUOTA CUBIERTA (no solo ser prestador)
--
-- Antes el with_check de courses solo pedía author_id + is_provider, así que un
-- prestador sin cuota podía crear y publicar cursos por API. Academy es una
-- función de negocio como tienda/ofertas/agenda; debe requerir cuota. El
-- with_check aplica a INSERT y UPDATE (cubre crear y publicar/editar). Borrar el
-- propio curso sigue permitido (USING author_id) aunque no haya cuota.
--
-- Criterio de cuota idéntico al del panel (activo/exento o periodo pagado
-- vigente). No se usa cuota_cubierta() porque 0171 la revocó a las sesiones, ni
-- is_member_active() porque cuenta 'pending' en gracia como activo. Idempotente.
-- ============================================================================

drop policy if exists courses_owner_all on public.courses;
create policy courses_owner_all on public.courses
  for all
  using (author_id = (select auth.uid()))
  with check (
    author_id = (select auth.uid())
    and public.is_provider((select auth.uid()))
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and (
          p.membership_status in ('active','exempt')
          or (p.membership_paid_until is not null and p.membership_paid_until > now())
        )
    )
  );
