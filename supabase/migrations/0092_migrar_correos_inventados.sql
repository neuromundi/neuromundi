-- ============================================================================
-- Neuromundi · sacar de auth.users los 355 correos inventados
--              (@preview.neuromundi.com) sin perder una sola ficha
--
-- ORDEN OBLIGATORIO. El paso 3 borra en cascada los perfiles; si el paso 2 no
-- copió bien, la ficha se pierde y no se recupera. Por eso el paso 2 verifica
-- antes de que el 3 borre.
--
-- ANTES DE EMPEZAR: haz un respaldo. En Supabase, Database → Backups.
-- ============================================================================

-- ── PASO 1 · mirar qué se va a mover (no cambia nada) ──────────────────────
select count(*) as usuarios_inventados,
       count(*) filter (where p.is_published) as publicados_hoy
from auth.users u
join public.profiles p on p.id = u.id
where u.email like '%@preview.neuromundi.com';
-- Debe decir 355 y 355. Si no coincide, detente y avísame.


-- ── PASO 2 · copiar esas 355 fichas a public.directorio ────────────────────
insert into public.directorio (
  id, nombre, provider_type, estado, ciudad, direccion, cp,
  lat, lng, telefono, correo, sitio_web, contactabilidad,
  especializacion, ambito, fuente, fuente_url, estado_revision, fecha_verificacion
)
select
  p.id,   -- conserva su identificador: cualquier enlace existente sigue resolviendo
  coalesce(nullif(p.business_name,''), p.full_name),
  coalesce(p.provider_type, 'service_provider'),
  p.state, coalesce(p.municipality, p.city), p.address, p.fiscal_cp,
  p.latitude, p.longitude,
  p.phone,
  null,                             -- sin correo: el que tenían era inventado
  coalesce(nullif(p.website,''), p.website_url),
  (case when p.phone   is not null and p.phone   <> '' then 2 else 0 end) +
  (case when coalesce(p.website, p.website_url) is not null
         and coalesce(p.website, p.website_url) <> '' then 1 else 0 end),
  p.services_offered,
  array_to_string(p.neuro_conditions, ' | '),
  'curado',
  null,
  case when p.is_published then 'publicado' else 'borrador' end,
  current_date
from public.profiles p
join auth.users u on u.id = p.id
where u.email like '%@preview.neuromundi.com'
on conflict (id) do nothing;

-- Verificación: tiene que dar 355 antes de continuar.
select count(*) as fichas_copiadas
from public.directorio where fuente = 'curado';


-- ── PASO 3 · borrar las cuentas inventadas ─────────────────────────────────
-- Esto borra en cascada sus filas de profiles, raffle_tickets y campaign_emails.
-- Las fichas ya viven en public.directorio, así que el directorio no pierde nada.
-- IRREVERSIBLE. Ejecútalo solo si el paso 2 dio 355.
--
-- delete from auth.users where email like '%@preview.neuromundi.com';


-- ── PASO 4 · comprobar cómo quedó todo ─────────────────────────────────────
select
  (select count(*) from auth.users where email like '%@preview%')      as correos_inventados_restantes,
  (select count(*) from public.profiles)                               as perfiles_con_cuenta_real,
  (select count(*) from public.directorio where estado_revision='publicado') as fichas_publicadas,
  (select count(*) from public.raffle_tickets)                         as boletos_de_rifa;
-- Esperado: 0 · 236 · 355 · 234
