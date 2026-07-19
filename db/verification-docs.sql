-- ============================================================================
-- verification-docs.sql — Bucket privado para documentos de verificación de
-- proveedores (identificación, cédula, RVOE, permisos…). Acceso solo del dueño.
-- Las referencias se guardan en profiles.provider_details.verification_docs.
-- Idempotente.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('verification', 'verification', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "verif_write_own" ON storage.objects;
CREATE POLICY "verif_write_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'verification' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "verif_read_own" ON storage.objects;
CREATE POLICY "verif_read_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'verification' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "verif_delete_own" ON storage.objects;
CREATE POLICY "verif_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'verification' AND (storage.foldername(name))[1] = auth.uid()::text);
