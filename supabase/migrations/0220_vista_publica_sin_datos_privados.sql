-- 0220 — La vista publica del directorio dejaba salir el expediente completo.
--
-- LA FALLA. public.directorio_publico es SECURITY DEFINER y tiene SELECT
-- concedido a anon. De sus 100 columnas, TREINTA no tienen nada que hacer en
-- un directorio publico: identificadores de Stripe (cliente, suscripcion,
-- cuenta conectada), RFC y los nueve campos fiscales, llave publica y token de
-- QR, fecha de nacimiento, genero, condicion y condiciones neurologicas (datos
-- de salud), estado y fechas de la membresia, codigo promocional usado, quien
-- lo refirio, y las fechas de suspension.
--
-- Hoy no se nota porque hay CERO perfiles publicados: la rama de la vista que
-- saca esas columnas no devuelve filas. Con el primer proveedor que pague y se
-- publique, un GET anonimo a /rest/v1/directorio_publico?select=* se lo lleva
-- todo. Es decir: la fuga se abre justo el dia que el negocio arranca.
--
-- POR QUE UNA VISTA NUEVA Y NO CORREGIR LA DE SIEMPRE. Quitar columnas exige
-- DROP VIEW, que arrastra las dependencias y no se puede hacer en caliente.
-- Y revocar columna por columna romperia el frontend, que consulta con
-- select('*'). Se crea una vista limpia, se apunta la aplicacion a ella, y a
-- la vieja se le retira el acceso publico: queda solo para el rol de servicio
-- y el panel de administracion.
--
-- membership_status se sustituye por `perfil_activo`, un si/no. La pantalla de
-- perfil solo lo usaba para decidir si bloquear la vista; para eso no hace
-- falta decirle al mundo si alguien esta moroso.
create or replace view public.directorio_publico_seguro as
select
  id, role, full_name, avatar_url, phone, bio, provider_type, business_name,
  website_url, address, city, country, is_verified, is_published,
  latitude, longitude, created_at, updated_at, state, municipality, is_company,
  services_offered, dial_code, website, instagram, tiktok, facebook,
  cedula_profesional, accepts_payments, consultation_amount,
  consultation_currency, school_grades, account_type, life_stage, interests,
  comms_opt_in, title_prefix, profession, whatsapp, booking_url, linkedin,
  specialties, modalities, age_ranges, intervention_areas, provider_details,
  product_categories, products_offered, sales_channels, shipping_coverage,
  price_range, search_tsv, badge_level, member_no, wants_founder,
  is_medical_override, neuroaffirming, accepts_neuromundi_id, is_advisor,
  sections, neuro_conditions, year_started, certified_staff, origen, clee,
  reclamable, provider_types, verificada,
  -- Si/no en lugar del estado de la membresia: lo unico que la pantalla
  -- necesitaba saber era si el perfil esta operativo.
  (membership_status is null or membership_status in ('active','exempt','past_due')) as perfil_activo
from public.directorio_publico;

grant select on public.directorio_publico_seguro to anon, authenticated;

-- Y se cierra la vieja al publico. El rol de servicio (webhook, funciones de
-- borde, cron) la sigue viendo entera, que es donde si hace falta.
revoke select on public.directorio_publico from anon, authenticated;
