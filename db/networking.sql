-- ============================================================================
-- NeuroDirectorio — Networking de proveedores y listas compartibles de padres
-- Aplica DESPUÉS de PARTE 1, prescriptions.sql y policies.sql. Idempotente.
-- ============================================================================

-- ── Helpers de rol (SECURITY DEFINER: evitan recursión de RLS) ───────────────
CREATE OR REPLACE FUNCTION public.is_provider(p_id UUID)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_id AND role = 'provider');
$$;

CREATE OR REPLACE FUNCTION public.is_parent(p_id UUID)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_id AND role = 'parent');
$$;

GRANT EXECUTE ON FUNCTION public.is_provider(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_parent(UUID)   TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- A. NETWORKING ENTRE PROVEEDORES (relación mutua)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.provider_connections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at  TIMESTAMPTZ,
  CONSTRAINT uq_connection UNIQUE (requester_id, addressee_id),
  CONSTRAINT chk_conn_not_self CHECK (requester_id <> addressee_id)
);
CREATE INDEX IF NOT EXISTS idx_conn_requester ON public.provider_connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_conn_addressee ON public.provider_connections(addressee_id);

ALTER TABLE public.provider_connections ENABLE ROW LEVEL SECURITY;

-- Lectura: las relaciones aceptadas son públicas (perfiles públicos); las
-- pendientes solo las ven las partes implicadas.
DROP POLICY IF EXISTS "connections_select" ON public.provider_connections;
CREATE POLICY "connections_select" ON public.provider_connections FOR SELECT
  USING (status = 'accepted' OR requester_id = auth.uid() OR addressee_id = auth.uid());

-- Solicitar: solo un proveedor puede solicitar a otro proveedor, en su nombre.
DROP POLICY IF EXISTS "connections_insert" ON public.provider_connections;
CREATE POLICY "connections_insert" ON public.provider_connections FOR INSERT
  WITH CHECK (
    requester_id = auth.uid()
    AND status = 'pending'
    AND public.is_provider(auth.uid())
    AND public.is_provider(addressee_id)
  );

-- Aceptar: solo el destinatario puede responder.
DROP POLICY IF EXISTS "connections_update_addressee" ON public.provider_connections;
CREATE POLICY "connections_update_addressee" ON public.provider_connections FOR UPDATE
  USING (addressee_id = auth.uid())
  WITH CHECK (addressee_id = auth.uid());

-- Eliminar: cualquiera de las dos partes (cancelar, rechazar o desconectar).
DROP POLICY IF EXISTS "connections_delete" ON public.provider_connections;
CREATE POLICY "connections_delete" ON public.provider_connections FOR DELETE
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- Las partes implicadas pueden leerse el perfil aunque no esté publicado.
DROP POLICY IF EXISTS "profiles_select_connected" ON public.profiles;
CREATE POLICY "profiles_select_connected" ON public.profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.provider_connections c
    WHERE (c.requester_id = auth.uid() AND c.addressee_id = profiles.id)
       OR (c.addressee_id = auth.uid() AND c.requester_id = profiles.id)
  ));

-- ════════════════════════════════════════════════════════════════════════════
-- B. LISTAS DE PADRES (compartibles con otros padres)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.parent_lists (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL DEFAULT 'Mis favoritos',
  is_public    BOOLEAN NOT NULL DEFAULT FALSE,
  share_token  UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lists_owner ON public.parent_lists(owner_id);
CREATE INDEX IF NOT EXISTS idx_lists_token ON public.parent_lists(share_token);

CREATE TABLE IF NOT EXISTS public.parent_list_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id      UUID NOT NULL REFERENCES public.parent_lists(id) ON DELETE CASCADE,
  provider_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_list_item UNIQUE (list_id, provider_id)
);
CREATE INDEX IF NOT EXISTS idx_list_items_list ON public.parent_list_items(list_id);

ALTER TABLE public.parent_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_list_items ENABLE ROW LEVEL SECURITY;

-- El dueño (padre) administra sus listas. La lectura compartida va por RPC.
DROP POLICY IF EXISTS "lists_owner_all" ON public.parent_lists;
CREATE POLICY "lists_owner_all" ON public.parent_lists FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid() AND public.is_parent(auth.uid()));

DROP POLICY IF EXISTS "list_items_owner_all" ON public.parent_list_items;
CREATE POLICY "list_items_owner_all" ON public.parent_list_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.parent_lists l WHERE l.id = list_id AND l.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.parent_lists l WHERE l.id = list_id AND l.owner_id = auth.uid()));

-- Ver una lista compartida por su token (solo si está marcada como pública).
-- SECURITY DEFINER: no expone enumeración de listas ni exige publicar perfiles.
CREATE OR REPLACE FUNCTION public.get_shared_list(p_token UUID)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'id', l.id,
    'title', l.title,
    'owner_name', p.full_name,
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'provider_id', pr.id,
        'name', COALESCE(pr.business_name, pr.full_name),
        'city', pr.city,
        'avatar_url', pr.avatar_url,
        'provider_type', pr.provider_type,
        'note', i.note
      ) ORDER BY i.created_at)
      FROM public.parent_list_items i
      JOIN public.profiles pr ON pr.id = i.provider_id
      WHERE i.list_id = l.id
    ), '[]'::jsonb)
  )
  FROM public.parent_lists l
  JOIN public.profiles p ON p.id = l.owner_id
  WHERE l.share_token = p_token AND l.is_public = TRUE;
$$;
GRANT EXECUTE ON FUNCTION public.get_shared_list(UUID) TO anon, authenticated;
