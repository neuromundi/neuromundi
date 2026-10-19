-- Hallazgo de la auditoría del 19 oct 2026: la vista pública del directorio
-- entregaba a cualquier visitante sin sesión dos banderas que no son
-- información del prestador para el público, sino datos internos sobre él:
--
--   · comms_opt_in  — si aceptó recibir comunicaciones de Neuromundi.
--   · wants_founder — si quiere ser Miembro Fundador (intención comercial).
--
-- Enyoria autorizó quitarlas. No afectan ninguna pantalla: se comprobó que la
-- aplicación no las lee de esta vista (comms_opt_in sólo se ESCRIBE al crear
-- la cuenta y wants_founder sólo es una casilla del formulario de registro),
-- y que ningún otro objeto de la base depende de esta vista.
--
-- Se dejan como NULL en vez de borrar las columnas. Motivo medido: borrar una
-- vista por la vía que usamos se queda colgado —se comprobó con una vista de
-- juguete— y `create or replace view` no permite quitar columnas (error
-- 42P16). Nulificarlas corta la publicación del dato igual de bien, sin
-- arriesgar a dejar el directorio sin su vista a días del arranque. Cuando se
-- pueda borrar con la herramienta de línea de comandos, se quitan del todo.
create or replace view public.directorio_publico_seguro as
 SELECT id, role, full_name, avatar_url, phone, bio, provider_type,
    business_name, website_url, address, city, country, is_verified,
    is_published, latitude, longitude, created_at, updated_at, state,
    municipality, is_company, services_offered, dial_code, website, instagram,
    tiktok, facebook, cedula_profesional, accepts_payments, consultation_amount,
    consultation_currency, school_grades, account_type, life_stage, interests,
    -- Ya no se publica: el consentimiento de comunicaciones es asunto entre el
    -- prestador y Neuromundi, no del visitante.
    NULL::boolean AS comms_opt_in,
    title_prefix, profession, whatsapp, booking_url, linkedin, specialties,
    modalities, age_ranges, intervention_areas, provider_details,
    product_categories, products_offered, sales_channels, shipping_coverage,
    price_range, search_tsv, badge_level, member_no,
    -- Ya no se publica: querer ser Fundador es intención comercial, no dato
    -- del directorio.
    NULL::boolean AS wants_founder,
    is_medical_override, neuroaffirming, accepts_neuromundi_id, is_advisor,
    sections, neuro_conditions, year_started, certified_staff, origen, clee,
    reclamable, provider_types, verificada, is_inclusive_school,
    is_inclusive_company, is_institutional_ally,
    membership_status IS NULL OR (membership_status = ANY (ARRAY['active'::text, 'exempt'::text, 'past_due'::text])) AS perfil_activo,
    ubicacion_aproximada
   FROM public.directorio_publico;
