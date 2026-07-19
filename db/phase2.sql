-- ============================================================================
-- NeuroDirectorio / Neuromundi — FASE 2 (Agenda + lista de espera + recordatorios)
-- Aplica DESPUÉS de db/phase1.sql (es el 9º archivo). Idempotente.
-- ============================================================================

-- ── A. Disponibilidad semanal del prestador ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.provider_availability (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  weekday      SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0=domingo … 6=sábado
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  slot_minutes INTEGER NOT NULL DEFAULT 60 CHECK (slot_minutes BETWEEN 10 AND 480),
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (end_time > start_time)
);
CREATE INDEX IF NOT EXISTS idx_availability_provider ON public.provider_availability(provider_id);

-- ── B. Citas ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ NOT NULL,
  status      TEXT NOT NULL DEFAULT 'booked'
              CHECK (status IN ('booked', 'cancelled', 'completed', 'no_show')),
  video_link  TEXT,            -- el prestador pega aquí su Zoom/Meet
  note        TEXT,
  source      TEXT NOT NULL DEFAULT 'booking' CHECK (source IN ('booking', 'waitlist')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_appts_provider ON public.appointments(provider_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_appts_patient ON public.appointments(patient_id, starts_at);

-- ── C. Lista de espera ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.waitlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note        TEXT,
  status      TEXT NOT NULL DEFAULT 'waiting'
              CHECK (status IN ('waiting', 'assigned', 'declined', 'cancelled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_waitlist_provider ON public.waitlist(provider_id, status);

-- ── D. Cola de recordatorios (la procesa la Edge Function send-reminders) ─────
CREATE TABLE IF NOT EXISTS public.appointment_reminders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  channel        TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  offset_hours   INTEGER NOT NULL,            -- 24 o 4
  send_at        TIMESTAMPTZ NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'sent', 'failed', 'skipped', 'cancelled')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON public.appointment_reminders(status, send_at);

-- ── E. Triggers de recordatorios ─────────────────────────────────────────────
-- Al crear una cita 'booked', encola recordatorios 24 h y 4 h antes por correo y
-- WhatsApp (solo los que aún quedan en el futuro).
CREATE OR REPLACE FUNCTION public.create_appointment_reminders()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  h INTEGER;
  c TEXT;
BEGIN
  IF NEW.status <> 'booked' THEN RETURN NEW; END IF;
  FOREACH h IN ARRAY ARRAY[24, 4] LOOP
    FOREACH c IN ARRAY ARRAY['email', 'whatsapp'] LOOP
      IF NEW.starts_at - make_interval(hours => h) > now() THEN
        INSERT INTO public.appointment_reminders (appointment_id, channel, offset_hours, send_at)
        VALUES (NEW.id, c, h, NEW.starts_at - make_interval(hours => h));
      END IF;
    END LOOP;
  END LOOP;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_create_reminders ON public.appointments;
CREATE TRIGGER trg_create_reminders
  AFTER INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.create_appointment_reminders();

-- Al cancelar/completar una cita, cancela sus recordatorios pendientes.
CREATE OR REPLACE FUNCTION public.cancel_appointment_reminders()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status <> 'booked' AND OLD.status = 'booked' THEN
    UPDATE public.appointment_reminders
    SET status = 'cancelled'
    WHERE appointment_id = NEW.id AND status = 'pending';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_cancel_reminders ON public.appointments;
CREATE TRIGGER trg_cancel_reminders
  AFTER UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.cancel_appointment_reminders();

-- ── F. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.provider_availability   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_reminders   ENABLE ROW LEVEL SECURITY;

-- Disponibilidad: el dueño la administra; cualquiera autenticado puede leerla
-- (necesario para que los consumidores vean los horarios y agenden).
DROP POLICY IF EXISTS "avail_owner_all" ON public.provider_availability;
CREATE POLICY "avail_owner_all" ON public.provider_availability FOR ALL
  USING (provider_id = auth.uid()) WITH CHECK (provider_id = auth.uid());
DROP POLICY IF EXISTS "avail_select_auth" ON public.provider_availability;
CREATE POLICY "avail_select_auth" ON public.provider_availability FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Citas: las ven y gestionan el prestador y el paciente involucrados.
DROP POLICY IF EXISTS "appts_select_parties" ON public.appointments;
CREATE POLICY "appts_select_parties" ON public.appointments FOR SELECT
  USING (provider_id = auth.uid() OR patient_id = auth.uid());

-- El paciente agenda; ambos deben ser miembros activos (la cuota de familias es
-- 'exempt', así que pasan; los prestadores deben estar al corriente).
DROP POLICY IF EXISTS "appts_insert_patient" ON public.appointments;
CREATE POLICY "appts_insert_patient" ON public.appointments FOR INSERT
  WITH CHECK (
    patient_id = auth.uid()
    AND provider_id <> auth.uid()
    AND public.is_member_active(provider_id)
    AND public.is_member_active(patient_id)
  );

-- El prestador también puede crear citas (p. ej. al asignar desde lista de espera).
DROP POLICY IF EXISTS "appts_insert_provider" ON public.appointments;
CREATE POLICY "appts_insert_provider" ON public.appointments FOR INSERT
  WITH CHECK (provider_id = auth.uid() AND public.is_member_active(provider_id));

-- Actualización: cualquiera de las dos partes (cancelar; el prestador edita link/estado).
DROP POLICY IF EXISTS "appts_update_parties" ON public.appointments;
CREATE POLICY "appts_update_parties" ON public.appointments FOR UPDATE
  USING (provider_id = auth.uid() OR patient_id = auth.uid())
  WITH CHECK (provider_id = auth.uid() OR patient_id = auth.uid());

-- Lista de espera: el paciente se anota; ambas partes la ven; el prestador la gestiona.
DROP POLICY IF EXISTS "waitlist_select_parties" ON public.waitlist;
CREATE POLICY "waitlist_select_parties" ON public.waitlist FOR SELECT
  USING (provider_id = auth.uid() OR patient_id = auth.uid());
DROP POLICY IF EXISTS "waitlist_insert_patient" ON public.waitlist;
CREATE POLICY "waitlist_insert_patient" ON public.waitlist FOR INSERT
  WITH CHECK (patient_id = auth.uid() AND public.is_member_active(provider_id));
DROP POLICY IF EXISTS "waitlist_update_parties" ON public.waitlist;
CREATE POLICY "waitlist_update_parties" ON public.waitlist FOR UPDATE
  USING (provider_id = auth.uid() OR patient_id = auth.uid())
  WITH CHECK (provider_id = auth.uid() OR patient_id = auth.uid());

-- Recordatorios: solo lectura para las partes; los inserta el trigger (definer).
DROP POLICY IF EXISTS "reminders_select_parties" ON public.appointment_reminders;
CREATE POLICY "reminders_select_parties" ON public.appointment_reminders FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = appointment_id AND (a.provider_id = auth.uid() OR a.patient_id = auth.uid())
  ));
