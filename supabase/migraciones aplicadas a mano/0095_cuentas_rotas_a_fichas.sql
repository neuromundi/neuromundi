-- ============================================================================
-- 0095 · las 232 cuentas importadas por SQL se vuelven fichas del directorio
--
-- POR QUÉ
--   Esas filas de auth.users se insertaron saltándose GoTrue: instance_id en
--   NULL, sin fila en auth.identities y con los tokens en NULL. Consecuencia
--   medida: la Admin API solo ve 5 de 237 cuentas, generateLink() no las
--   encuentra, y sin identidad no hay forma de autenticarse por correo.
--   Ninguna de las 232 ha iniciado sesión nunca.
--
--   Repararlas sería arreglar cuentas que nadie pidió, para volver al modelo
--   que ya se descartó. La 0093 hace lo contrario y mejor: la cuenta nace
--   cuando la persona acepta su invitación, y nace sana porque pasa por la
--   API de administración.
--
--   Al terminar queda un solo camino para todos: ficha en el directorio,
--   invitación por token, cuenta al aceptar.
--
-- DIFERENCIA CON LA 0092
--   Aquellas 355 tenían correo inventado y se copiaron sin él. Estas 232
--   tienen correo REAL: se conserva, y por eso sí generan invitación.
--
-- ORDEN OBLIGATORIO. El paso 4 borra en cascada. Respaldo antes: Database →
-- Backups.
-- ============================================================================

-- ── PASO 1 · ver qué se va a mover (no cambia nada) ────────────────────────
select count(*) as cuentas_rotas,
       count(*) filter (where u.last_sign_in_at is not null) as han_entrado
from auth.users u join public.profiles p on p.id = u.id
where u.instance_id is null and p.role = 'provider';
-- Debe decir 232 y 0. Si "han_entrado" no es 0, DETENTE: alguien está usando
-- su cuenta y hay que decidir caso por caso.


-- ── PASO 2 · respaldo ──────────────────────────────────────────────────────
create table if not exists public.respaldo_232_profiles as
  select p.*, u.email as correo_real, u.created_at as cuenta_creada_en
  from public.profiles p join auth.users u on u.id = p.id
  where u.instance_id is null and p.role = 'provider';

create table if not exists public.respaldo_232_raffle as
  select r.* from public.raffle_tickets r
  where r.user_id in (select id from public.respaldo_232_profiles);

create table if not exists public.respaldo_232_campaign as
  select c.* from public.campaign_emails c
  where c.user_id in (select id from public.respaldo_232_profiles);

-- Las tablas nuevas quedarían legibles por la API pública. Se cierran.
alter table public.respaldo_232_profiles enable row level security;
alter table public.respaldo_232_raffle   enable row level security;
alter table public.respaldo_232_campaign enable row level security;
revoke all on public.respaldo_232_profiles, public.respaldo_232_raffle,
              public.respaldo_232_campaign from anon, authenticated;

select count(*) as respaldadas from public.respaldo_232_profiles;   -- debe dar 232


-- ── PASO 3 · copiar a public.directorio, con su correo ─────────────────────
insert into public.directorio (
  id, nombre, provider_type, estado, ciudad, direccion, cp,
  lat, lng, telefono, correo, sitio_web, contactabilidad,
  especializacion, ambito, fuente, estado_revision, fecha_verificacion
)
select
  r.id,                                   -- conserva su identificador
  coalesce(nullif(r.business_name,''), r.full_name),
  coalesce(r.provider_type, 'service_provider'),
  r.state, coalesce(r.municipality, r.city), r.address, r.fiscal_cp,
  r.latitude, r.longitude,
  r.phone,
  lower(r.correo_real),                   -- este sí es real
  coalesce(nullif(r.website,''), r.website_url),
  (case when r.phone is not null and r.phone <> '' then 2 else 0 end) +
  2 +                                     -- siempre tienen correo
  (case when coalesce(r.website, r.website_url) is not null
         and coalesce(r.website, r.website_url) <> '' then 1 else 0 end),
  r.services_offered,
  array_to_string(r.neuro_conditions, ' | '),
  'curado',
  case when r.is_published then 'publicado' else 'borrador' end,
  current_date
from public.respaldo_232_profiles r
on conflict (id) do nothing;

select count(*) as fichas_curadas from public.directorio where fuente = 'curado';
-- Debe dar 587 (las 355 de la 0092 más estas 232).


-- ── PASO 4 · borrar las cuentas rotas ──────────────────────────────────────
-- Borra en cascada sus filas de profiles, raffle_tickets y campaign_emails.
-- Las fichas ya viven en public.directorio. IRREVERSIBLE.
-- Ejecútalo solo si el paso 3 dio 587.
--
-- delete from auth.users u
--  where u.instance_id is null
--    and exists (select 1 from public.profiles p where p.id = u.id and p.role = 'provider');


-- ── PASO 5 · crear sus invitaciones ────────────────────────────────────────
insert into public.directorio_invitaciones (directorio_id, correo)
select d.id, lower(d.correo)
from public.directorio d
where d.correo is not null
  and d.correo ~* '^[^@\s]+@[^@\s.]+\.[a-z]{2,}$'
  and d.correo !~* '@preview\.neuromundi\.com$'
  and d.estado_revision = 'publicado'
  and not d.baja_solicitada
  and d.reclamada_por is null
  and not exists (
    select 1 from public.directorio_invitaciones i
    where i.directorio_id = d.id and i.usada_en is null and i.baja_en is null
  )
on conflict do nothing;


-- ── PASO 6 · comprobar ─────────────────────────────────────────────────────
select
  (select count(*) from auth.users where instance_id is null)          as cuentas_rotas_restantes,
  (select count(*) from public.profiles)                               as perfiles_con_cuenta_sana,
  (select count(*) from public.directorio where estado_revision='publicado') as fichas_publicadas,
  (select count(*) from public.directorio_publico)                     as total_en_el_buscador,
  (select count(*) from public.directorio_invitaciones
     where enviada_en is null and usada_en is null and baja_en is null) as invitaciones_por_enviar;
-- Esperado tras el paso 4:  0 · 5 · 679 · 679 · 324
