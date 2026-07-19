-- ============================================================================
-- verification-bucket.sql — Bucket PRIVADO para documentos de verificación que
-- el proveedor sube desde el asistente "Completa tu perfil". Cada usuario solo
-- accede a su propia carpeta (${uid}/...). El equipo/admin accede vía service
-- role. Idempotente.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('verification', 'verification', FALSE)
ON CONFLICT (id) DO NOTHING;

-- El usuario sube y ve solo su carpeta.
DROP POLICY IF EXISTS "verification_insert_own" ON storage.objects;
CREATE POLICY "verification_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'verification' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "verification_select_own" ON storage.objects;
CREATE POLICY "verification_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'verification' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "verification_delete_own" ON storage.objects;
CREATE POLICY "verification_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'verification' AND (storage.foldername(name))[1] = auth.uid()::text);
