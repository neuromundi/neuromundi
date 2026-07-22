-- ============================================================================
-- Acceso del administrador a los documentos de verificación (para moderar)
-- ----------------------------------------------------------------------------
-- El bucket privado `verification` guarda la cédula/documento profesional que
-- sube cada prestador. Las políticas base solo permiten leer lo PROPIO; esta
-- política adicional deja que el ADMIN (is_admin) lea cualquier documento para
-- revisar la profesión en la sección Moderación. Idempotente.
-- ============================================================================

drop policy if exists "verification_read_admin" on storage.objects;
create policy "verification_read_admin" on storage.objects
  for select using (bucket_id = 'verification' and public.is_admin());
