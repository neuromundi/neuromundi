-- ============================================================================
-- 0096 · sector, rebotes y cola de campaña
--
-- Recoge los cambios que se aplicaron directo en producción el 8 y 9 de
-- septiembre de 2026 y que no tenían archivo de migración. Es idempotente:
-- correrla de nuevo no rompe nada. YA ESTÁ APLICADA en producción.
--
-- Contexto: el 8 de septiembre el cron nm-campaign-emails mandó 100 correos
-- de "Miembro Fundador" a proveedores sembrados que nunca se registraron.
-- 77 recibieron una oferta de pago, de los cuales 20 eran organismos públicos.
-- De ahí salen los tres cambios de aquí.
-- ============================================================================

-- ── 1 · A quién se le pide cuota ────────────────────────────────────────────
-- El SCIAN del INEGI distingue sector público de privado EN EL CÓDIGO: las
-- clases pares son públicas (611182 escuelas públicas, 611181 privadas). Para
-- las fichas de investigación propia se usa la figura jurídica del nombre.
alter table public.directorio add column if not exists sector text;
alter table public.directorio drop constraint if exists directorio_sector_valido;
alter table public.directorio add constraint directorio_sector_valido
  check (sector is null or sector in ('publico','social','privado'));
comment on column public.directorio.sector is
  'publico = gobierno; social = asociacion civil o empresa social; privado = con fines de lucro. Decide si se le pide cuota.';

update public.directorio set sector = 'publico'
 where sector is null and clase_scian in ('611182','621332','621342','621422','622212');
update public.directorio set sector = 'privado'
 where sector is null and clase_scian in ('611181','621331','621341','621421','622211');
update public.directorio set sector = 'social'
 where sector is null and provider_type in ('ngo','company');
update public.directorio set sector = 'publico'
 where sector is null
   and (nombre ~* '\m(DIF|USAER|CAPEP|CAIC)\M'
     or nombre ~* 'CENTRO DE ATENCION MULTIPLE|\mCAM\M'
     or nombre ~* 'SECRETAR|GOBIERNO|MUNICIPAL|ESTATAL|COMISION (ESTATAL|NACIONAL)|DERECHOS HUMANOS|SISTEMA PARA EL DESARROLLO INTEGRAL|INSTITUTO NACIONAL|PROCURADUR|AYUNTAMIENTO'
     or correo ~* '(\.gob\.mx|\.edu\.mx|jaliscoedu\.mx|uv\.mx|umich\.mx|unam\.mx)$');
update public.directorio set sector = 'social'
 where sector is null
   and (nombre ~* '\mA\.? ?C\.?\M|I\.?A\.?P|FUNDACI|ASOCIACI|TELET[OÓ]N|\mCRIT\M'
     or correo ~* '\.org(\.mx)?$');
update public.directorio set sector = 'publico'
 where sector is null
   and nombre ~* 'DIFEM|\(DIF|UNIVERSITARIO|\mUANL\M|GUERRERENSE|\mCREE\M|CENTRO DE REHABILITACION INTEGRAL|\mCRI\M';
update public.directorio set sector = 'privado'
 where sector is null and provider_type in ('merchant','wellness','legal','tourism','caregiver');

-- ── 2 · Correos que rebotaron e invitaciones canceladas ─────────────────────
-- Se conserva la dirección como dato histórico y se marca como inservible:
-- volver a escribir a un buzón muerto daña la reputación del dominio.
alter table public.directorio add column if not exists correo_rebotado boolean not null default false;
alter table public.directorio add column if not exists correo_rebotado_el date;
alter table public.directorio_invitaciones add column if not exists cancelada_en timestamptz;
alter table public.directorio_invitaciones add column if not exists cancelada_motivo text;

-- El dominio puede llevar puntos: fudac.org.mx, teleton.org.mx, sedif.gob.mx.
-- La versión anterior admitía un solo punto y rechazaba 63 correos válidos.
alter table public.directorio_invitaciones drop constraint if exists invitacion_correo_valido;
alter table public.directorio_invitaciones add constraint invitacion_correo_valido
  check (correo ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$');

-- ── 3 · La ficha del token ahora dice su sector ─────────────────────────────
drop function if exists public.ficha_por_token(text);
create function public.ficha_por_token(p_token text)
returns table (
  ficha_id uuid, nombre text, provider_type text, estado text, ciudad text,
  direccion text, telefono text, correo text, sitio_web text,
  especializacion text, fuente text, fuente_url text, sector text)
language sql stable security definer set search_path to 'public' as $$
  select d.id, d.nombre, d.provider_type, d.estado, d.ciudad, d.direccion,
         d.telefono, i.correo, d.sitio_web, d.especializacion, d.fuente,
         d.fuente_url, coalesce(d.sector, 'privado')
  from public.directorio_invitaciones i
  join public.directorio d on d.id = i.directorio_id
  where i.token = p_token and i.usada_en is null and i.baja_en is null
    and i.cancelada_en is null and i.expira_en > now() and not d.baja_solicitada
  limit 1;
$$;
revoke all on function public.ficha_por_token(text) from public;
grant execute on function public.ficha_por_token(text) to anon, authenticated;

-- ── 4 · La cola de campaña ahora dice si esa persona paga ───────────────────
-- Antes, la variante del correo la decidía solo provider_type, y un DIF estatal
-- está clasificado como 'clinic': por eso 20 organismos públicos recibieron una
-- oferta de pago con fecha límite.
drop function if exists public.campaign_welcome_queue();
create function public.campaign_welcome_queue()
returns table(user_id uuid, email text, name text, role text, provider_type text,
              country text, opens_at timestamp with time zone, sector text)
language sql stable security definer set search_path to 'public' as $$
  select ce.user_id, u.email,
         coalesce(nullif(p.business_name, ''), nullif(p.full_name, ''), 'Miembro'),
         p.role::text, p.provider_type::text, p.country,
         (select c.start_at + (coalesce((c.block_days_by_country->>p.country)::int, c.default_block_days) || ' days')::interval
          from public.campaign_config c where c.id = 1),
         case when p.membership_status = 'exempt' then 'publico'
              else coalesce(d.sector, 'privado') end
  from public.campaign_emails ce
  join public.profiles p on p.id = ce.user_id
  join auth.users u on u.id = ce.user_id
  left join public.directorio d on d.reclamada_por = p.id
  where ce.welcome_sent_at is null and u.email is not null
  limit 200;
$$;

-- ── 5 · Registro del envío no autorizado ────────────────────────────────────
-- La evidencia en campaign_emails se perdió al borrar las cuentas; esta tabla
-- la reconstruye desde el registro de Resend.
create table if not exists public.contactados_campana_20260908 (
  correo text primary key,
  asunto text not null default '¡Bienvenido a Neuromundi, Miembro Fundador!',
  enviado_el date not null default date '2026-09-08',
  nota text
);
alter table public.contactados_campana_20260908 enable row level security;
revoke all on public.contactados_campana_20260908 from anon, authenticated;

-- ── Comprobación ────────────────────────────────────────────────────────────
select coalesce(sector,'sin clasificar') as sector, count(*)
from public.directorio where estado_revision='publicado' group by 1 order by 2 desc;
