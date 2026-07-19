-- ============================================================================
-- NeuroDirectorio / Neuromundi — FASE 5 (Clínico + cifrado)
-- Aplica DESPUÉS de db/phase4.sql (es el 12º archivo). Idempotente.
--
-- AVISO: esto NO es un expediente clínico certificado. El cumplimiento normativo
-- (NOM-024 MX, HIPAA, GDPR…) requiere revisión legal y de seguridad.
--
-- Modelo de acceso: la familia (paciente/padre) es dueña de su expediente. Un
-- especialista solo accede si tiene un consentimiento ACTIVO. El texto clínico
-- usa RLS + cifrado en reposo de Supabase; el intercambio de ARCHIVOS es E2E
-- (el servidor solo guarda cifrado).
-- ============================================================================

-- ── A. Llave pública para el cifrado E2E de archivos ─────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_key TEXT;

-- ── B. Consentimientos clínicos ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clinical_consents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- familia (dueña)
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- especialista
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at  TIMESTAMPTZ,
  CONSTRAINT uq_consent UNIQUE (patient_id, provider_id)
);
CREATE INDEX IF NOT EXISTS idx_consent_provider ON public.clinical_consents(provider_id, status);

-- ¿Tiene `viewer` acceso al expediente de `patient`? (dueño o especialista con consentimiento activo)
CREATE OR REPLACE FUNCTION public.has_clinical_access(p_patient UUID, p_viewer UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_patient = p_viewer
      OR EXISTS (
        SELECT 1 FROM public.clinical_consents c
        WHERE c.patient_id = p_patient AND c.provider_id = p_viewer AND c.status = 'active'
      );
$$;
GRANT EXECUTE ON FUNCTION public.has_clinical_access(UUID, UUID) TO authenticated;

-- ── C. Entradas del expediente (notas y reportes mensuales) ──────────────────
CREATE TABLE IF NOT EXISTS public.clinical_entries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL DEFAULT 'note' CHECK (kind IN ('note', 'report')),
  title      TEXT NOT NULL,
  body       TEXT,
  period     TEXT,                       -- p. ej. '2026-06' para reportes mensuales
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_entries_patient ON public.clinical_entries(patient_id, created_at);

-- ── D. Tareas / ejercicios en casa ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.home_tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  detail       TEXT,
  due_date     DATE,
  completed    BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_patient ON public.home_tasks(patient_id, completed);

-- ── E. Chat asíncrono (familia ↔ especialista con consentimiento) ────────────
CREATE TABLE IF NOT EXISTS public.clinical_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_msgs_thread ON public.clinical_messages(patient_id, provider_id, created_at);

-- ── F. Intercambio de archivos cifrados E2E (el servidor solo ve cifrado) ────
-- Bucket privado para los archivos cifrados.
INSERT INTO storage.buckets (id, name, public)
VALUES ('secure', 'secure', FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.secure_files (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  filename     TEXT NOT NULL,
  mime         TEXT,
  storage_path TEXT NOT NULL,
  iv           TEXT NOT NULL,            -- IV de AES-GCM (base64)
  expires_at   TIMESTAMPTZ,             -- autoborrado
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_secure_files_patient ON public.secure_files(patient_id);
CREATE INDEX IF NOT EXISTS idx_secure_files_expires ON public.secure_files(expires_at);

-- Llave AES envuelta por cada destinatario (envelope encryption).
CREATE TABLE IF NOT EXISTS public.secure_file_keys (
  file_id      UUID NOT NULL REFERENCES public.secure_files(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wrapped_key  TEXT NOT NULL,           -- llave AES cifrada con la pública del destinatario (base64)
  PRIMARY KEY (file_id, recipient_id)
);

-- ── G. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.clinical_consents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_entries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secure_files       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secure_file_keys   ENABLE ROW LEVEL SECURITY;

-- Consentimientos: los gestiona la familia; el especialista los ve.
DROP POLICY IF EXISTS "consent_select_parties" ON public.clinical_consents;
CREATE POLICY "consent_select_parties" ON public.clinical_consents FOR SELECT
  USING (patient_id = auth.uid() OR provider_id = auth.uid());
DROP POLICY IF EXISTS "consent_manage_owner" ON public.clinical_consents;
CREATE POLICY "consent_manage_owner" ON public.clinical_consents FOR ALL
  USING (patient_id = auth.uid()) WITH CHECK (patient_id = auth.uid());

-- Entradas: lectura para quien tenga acceso; escritura por la familia o un especialista con acceso.
DROP POLICY IF EXISTS "entries_select_access" ON public.clinical_entries;
CREATE POLICY "entries_select_access" ON public.clinical_entries FOR SELECT
  USING (public.has_clinical_access(patient_id, auth.uid()));
DROP POLICY IF EXISTS "entries_insert_access" ON public.clinical_entries;
CREATE POLICY "entries_insert_access" ON public.clinical_entries FOR INSERT
  WITH CHECK (author_id = auth.uid() AND public.has_clinical_access(patient_id, auth.uid()));
DROP POLICY IF EXISTS "entries_delete_author" ON public.clinical_entries;
CREATE POLICY "entries_delete_author" ON public.clinical_entries FOR DELETE
  USING (author_id = auth.uid());

-- Tareas: lectura para quien tenga acceso; el especialista crea; la familia marca completado.
DROP POLICY IF EXISTS "tasks_select_access" ON public.home_tasks;
CREATE POLICY "tasks_select_access" ON public.home_tasks FOR SELECT
  USING (public.has_clinical_access(patient_id, auth.uid()));
DROP POLICY IF EXISTS "tasks_insert_provider" ON public.home_tasks;
CREATE POLICY "tasks_insert_provider" ON public.home_tasks FOR INSERT
  WITH CHECK (provider_id = auth.uid() AND public.has_clinical_access(patient_id, auth.uid()));
DROP POLICY IF EXISTS "tasks_update_access" ON public.home_tasks;
CREATE POLICY "tasks_update_access" ON public.home_tasks FOR UPDATE
  USING (public.has_clinical_access(patient_id, auth.uid()))
  WITH CHECK (public.has_clinical_access(patient_id, auth.uid()));

-- Chat: solo las dos partes, y solo con consentimiento activo.
DROP POLICY IF EXISTS "msgs_select_parties" ON public.clinical_messages;
CREATE POLICY "msgs_select_parties" ON public.clinical_messages FOR SELECT
  USING ((patient_id = auth.uid() OR provider_id = auth.uid()) AND public.has_clinical_access(patient_id, provider_id));
DROP POLICY IF EXISTS "msgs_insert_sender" ON public.clinical_messages;
CREATE POLICY "msgs_insert_sender" ON public.clinical_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid()
    AND (auth.uid() = patient_id OR auth.uid() = provider_id)
    AND public.has_clinical_access(patient_id, provider_id));

-- Archivos cifrados: el dueño y los destinatarios (con llave envuelta).
DROP POLICY IF EXISTS "files_select_recipients" ON public.secure_files;
CREATE POLICY "files_select_recipients" ON public.secure_files FOR SELECT
  USING (owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.secure_file_keys k WHERE k.file_id = id AND k.recipient_id = auth.uid()));
DROP POLICY IF EXISTS "files_insert_owner" ON public.secure_files;
CREATE POLICY "files_insert_owner" ON public.secure_files FOR INSERT
  WITH CHECK (owner_id = auth.uid() AND public.has_clinical_access(patient_id, auth.uid()));
DROP POLICY IF EXISTS "files_delete_owner" ON public.secure_files;
CREATE POLICY "files_delete_owner" ON public.secure_files FOR DELETE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "filekeys_select_parties" ON public.secure_file_keys;
CREATE POLICY "filekeys_select_parties" ON public.secure_file_keys FOR SELECT
  USING (recipient_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.secure_files f WHERE f.id = file_id AND f.owner_id = auth.uid()));
DROP POLICY IF EXISTS "filekeys_insert_owner" ON public.secure_file_keys;
CREATE POLICY "filekeys_insert_owner" ON public.secure_file_keys FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.secure_files f WHERE f.id = file_id AND f.owner_id = auth.uid()));

-- ── H. Políticas de Storage para el bucket 'secure' ──────────────────────────
DROP POLICY IF EXISTS "secure_read" ON storage.objects;
CREATE POLICY "secure_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'secure' AND EXISTS (
    SELECT 1 FROM public.secure_files f
    WHERE f.storage_path = name
      AND (f.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.secure_file_keys k WHERE k.file_id = f.id AND k.recipient_id = auth.uid()))
  ));
DROP POLICY IF EXISTS "secure_write_own" ON storage.objects;
CREATE POLICY "secure_write_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'secure' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "secure_delete_own" ON storage.objects;
CREATE POLICY "secure_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'secure' AND (storage.foldername(name))[1] = auth.uid()::text);
