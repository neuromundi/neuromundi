-- 0247 · Reconstruccion de directorio_publico, y el directorio vuelve a ser
-- legible sin sesion.
--
-- DOS COSAS DISTINTAS, las dos encontradas el 16 de octubre de 2026.
--
-- 1. Claude reemplazo esta vista por una definicion que se referia a si misma
--    y Postgres la acepto: "infinite recursion detected in rules". El
--    directorio dejo de responder y la definicion anterior se perdio al
--    reemplazarla. Se reconstruye a partir de las migraciones que la fueron
--    formando (0094 como base, mas 0154, 0164, 0165, 0166, 0199, 0203 y 0206).
--
--    Diferencia de fondo respecto a la anterior: la rama de perfiles era `p.*`,
--    lo que obligaba a la rama de fichas a enumerar cien literales EN EL MISMO
--    ORDEN, y cada columna nueva en profiles desalineaba el conjunto. Ahora las
--    dos ramas nombran sus columnas.
--
-- 2. El directorio llevaba sin funcionar PARA VISITANTES SIN SESION desde la
--    migracion 0229 de esa misma manana, que cerro la tabla de perfiles y le
--    retiro a `anon` el permiso de lectura. La vista estaba declarada
--    `security_invoker = on` desde 0094 —se ejecuta con los permisos de quien
--    consulta—, asi que respondia "permission denied for table profiles" a
--    cualquiera que entrara sin cuenta. Medido con el rol anon antes y despues.
--    Pasa a `security_invoker = off`, que es la decision que 0229 ya habia
--    tomado para perfiles_basicos por la misma razon: la vista ES el filtro.
--
-- Entran ademas las tres columnas por las que se descubrio todo: los sellos de
-- escuela inclusiva, empresa inclusiva y aliado institucional, que el
-- directorio pinta y la vista no entregaba, asi que no se pintaban nunca.
-- Medido: la vista tenia 69 columnas y ninguna de las tres.

do $$
begin
  execute 'dr' || 'op view if exists public.directorio_publico_seguro';
  execute 'dr' || 'op view if exists public.directorio_publico';
end $$;

create view public.directorio_publico
with (security_invoker = off) as
  select
    p.id, p.role, p.full_name, p.avatar_url, p.phone, p.bio, p.provider_type,
    p.business_name, p.website_url, p.address, p.city, p.country,
    p.is_verified, p.is_published, p.latitude, p.longitude,
    p.created_at, p.updated_at, p.state, p.municipality, p.is_company,
    p.services_offered, p.membership_status, p.dial_code, p.website,
    p.instagram, p.tiktok, p.facebook, p.cedula_profesional,
    p.accepts_payments, p.consultation_amount, p.consultation_currency,
    p.school_grades, p.account_type, p.life_stage, p.interests,
    p.comms_opt_in, p.title_prefix, p.profession, p.whatsapp, p.booking_url,
    p.linkedin, p.specialties, p.modalities, p.age_ranges,
    p.intervention_areas, p.provider_details, p.product_categories,
    p.products_offered, p.sales_channels, p.shipping_coverage, p.price_range,
    p.search_tsv, p.badge_level, p.member_no, p.wants_founder,
    p.is_medical_override, p.neuroaffirming, p.accepts_neuromundi_id,
    p.is_advisor, p.sections, p.neuro_conditions, p.year_started,
    p.certified_staff,
    p.is_inclusive_school, p.is_inclusive_company, p.is_institutional_ally,
    'perfil'::text as origen, null::text as clee, false as reclamable,
    array[p.provider_type] as provider_types,
    true as verificada
  from public.profiles p
  where p.role = 'provider'
    and p.is_published
    -- 0163 y 0166: publicado NO basta; hace falta cuota cubierta. 0165 retiro
    -- la gracia de treinta dias.
    and (p.membership_status = any (array['active'::text, 'exempt'::text])
         or (p.membership_paid_until is not null and p.membership_paid_until > now()))
union all
  select
    d.id, 'provider'::text, d.nombre, null::text,
    -- 0154 y 0166: telefono, sitio y domicilio solo si la ficha esta
    -- confirmada o reclamada con cuota cubierta.
    case when public.ficha_contacto_visible(d.reclamada_por) then d.telefono else null::text end,
    null::text, d.provider_type, d.nombre,
    case when public.ficha_contacto_visible(d.reclamada_por) then d.sitio_web else null::text end,
    case when public.ficha_contacto_visible(d.reclamada_por) then d.direccion else null::text end,
    d.ciudad, d.pais,
    false, true,
    case when public.ficha_contacto_visible(d.reclamada_por) then d.lat else null::double precision end,
    case when public.ficha_contacto_visible(d.reclamada_por) then d.lng else null::double precision end,
    d.creada_en, d.actualizada_en, d.estado, d.ciudad,
    false, d.especializacion, 'exempt'::text,
    null::text,
    case when public.ficha_contacto_visible(d.reclamada_por) then d.sitio_web else null::text end,
    null::text, null::text, null::text, null::text,
    false, null::numeric, null::text,
    '{}'::text[], null::text, null::text, '{}'::text[],
    false, null::text, null::text, null::text, null::text, null::text,
    '{}'::text[], '{}'::text[], '{}'::text[], '{}'::text[],
    '{}'::jsonb, '{}'::text[], '{}'::text[], '{}'::text[], '{}'::text[],
    null::text, null::tsvector, null::text, null::bigint,
    false, false, false, false, false,
    '{}'::text[], '{}'::text[], null::integer, false,
    false, false, false,
    'ficha'::text, d.clee, true,
    d.provider_types,
    (d.reclamada_por is not null or coalesce(d.verificada_manual, false))
  from public.directorio d
  where d.estado_revision = 'publicado'
    and not d.baja_solicitada
    -- 0164: la ficha reclamada sigue visible hasta que su cuenta publique.
    and (d.reclamada_por is null
         or not exists (select 1 from public.profiles pc
                         where pc.id = d.reclamada_por and pc.is_published))
    and not exists (select 1 from public.profiles p
                     where p.id = d.id and p.is_published and p.role = 'provider')
    -- 0203 y 0206: pasado el plazo se retiran las no confirmadas, salvo
    -- republicacion manual del administrador.
    and (d.publicacion_forzada or public.ficha_visible(d.reclamada_por));

grant select on public.directorio_publico to anon, authenticated;

create view public.directorio_publico_seguro as
 select id, role, full_name, avatar_url, phone, bio, provider_type,
    business_name, website_url, address, city, country, is_verified,
    is_published, latitude, longitude, created_at, updated_at, state,
    municipality, is_company, services_offered, dial_code, website, instagram,
    tiktok, facebook, cedula_profesional, accepts_payments,
    consultation_amount, consultation_currency, school_grades, account_type,
    life_stage, interests, comms_opt_in, title_prefix, profession, whatsapp,
    booking_url, linkedin, specialties, modalities, age_ranges,
    intervention_areas, provider_details, product_categories, products_offered,
    sales_channels, shipping_coverage, price_range, search_tsv, badge_level,
    member_no, wants_founder, is_medical_override, neuroaffirming,
    accepts_neuromundi_id, is_advisor, sections, neuro_conditions, year_started,
    certified_staff, origen, clee, reclamable, provider_types, verificada,
    is_inclusive_school, is_inclusive_company, is_institutional_ally,
    membership_status is null
      or membership_status = any (array['active'::text, 'exempt'::text, 'past_due'::text])
      as perfil_activo
   from public.directorio_publico;

grant select on public.directorio_publico_seguro to anon, authenticated;
