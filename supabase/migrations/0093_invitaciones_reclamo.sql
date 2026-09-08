-- ============================================================================
-- Neuromundi · invitar a reclamar una ficha, sin crear cuentas fantasma
--
-- La cuenta NO existe hasta que la persona acepta. El enlace de invitación
-- lleva un token de un solo uso; al aceptarlo se crea su usuario y su perfil
-- con los datos de la ficha, y la ficha queda marcada como reclamada.
--
-- El mismo enlace ofrece la salida: "quitar mi ficha". Sin necesidad de cuenta.
-- ============================================================================

create table if not exists public.directorio_invitaciones (
  id            uuid primary key default gen_random_uuid(),
  directorio_id uuid not null references public.directorio(id) on delete cascade,
  correo        text not null,
  token         text not null unique default encode(gen_random_bytes(24), 'hex'),
  creada_en     timestamptz not null default now(),
  enviada_en    timestamptz,
  expira_en     timestamptz not null default now() + interval '90 days',
  abierta_en    timestamptz,
  usada_en      timestamptz,
  baja_en       timestamptz,
  constraint invitacion_correo_valido check (correo ~* '^[^@\s]+@[^@\s.]+\.[a-z]{2,}$'),
  constraint invitacion_correo_no_inventado check (correo !~* '@preview\.neuromundi\.com$')
);

create index if not exists invitaciones_ficha_idx on public.directorio_invitaciones (directorio_id);
create unique index if not exists invitaciones_una_viva_idx
  on public.directorio_invitaciones (directorio_id)
  where usada_en is null and baja_en is null;   -- una invitación viva por ficha

alter table public.directorio_invitaciones enable row level security;
-- Sin política de lectura: nadie consulta esta tabla directamente. Todo pasa
-- por las funciones de abajo, que solo aceptan el token completo.

-- ---------------------------------------------------------------------------
-- Lo que ve quien abre el enlace. Devuelve la ficha, nunca el correo ni el
-- token de nadie más, y solo si la invitación sigue viva.
-- ---------------------------------------------------------------------------
create or replace function public.ficha_por_token(p_token text)
returns table (
  ficha_id uuid, nombre text, provider_type text,
  estado text, ciudad text, direccion text,
  telefono text, correo text, sitio_web text,
  especializacion text, fuente text, fuente_url text
)
language sql stable security definer set search_path to 'public' as $$
  select d.id, d.nombre, d.provider_type,
         d.estado, d.ciudad, d.direccion,
         d.telefono, i.correo, d.sitio_web,
         d.especializacion, d.fuente, d.fuente_url
  from public.directorio_invitaciones i
  join public.directorio d on d.id = i.directorio_id
  where i.token = p_token
    and i.usada_en is null
    and i.baja_en is null
    and i.expira_en > now()
    and not d.baja_solicitada
  limit 1;
$$;

revoke all on function public.ficha_por_token(text) from public;
grant execute on function public.ficha_por_token(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- "Quiten mi ficha". Sin cuenta, sin discutir, en un clic.
-- Marca la baja y oculta la ficha del buscador de inmediato.
-- ---------------------------------------------------------------------------
create or replace function public.solicitar_baja_ficha(p_token text, p_motivo text default null)
returns boolean
language plpgsql volatile security definer set search_path to 'public' as $$
declare v_ficha uuid;
begin
  select i.directorio_id into v_ficha
  from public.directorio_invitaciones i
  where i.token = p_token and i.usada_en is null and i.expira_en > now();

  if v_ficha is null then return false; end if;

  update public.directorio
     set baja_solicitada = true,
         baja_motivo     = left(coalesce(p_motivo, ''), 500),
         estado_revision = 'borrador',
         actualizada_en  = now()
   where id = v_ficha;

  update public.directorio_invitaciones
     set baja_en = now()
   where directorio_id = v_ficha and baja_en is null;

  return true;
end $$;

revoke all on function public.solicitar_baja_ficha(text, text) from public;
grant execute on function public.solicitar_baja_ficha(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Enlazar la ficha con el perfil recién creado. La llama la Edge Function
-- después de crear la cuenta; no se expone al público.
-- ---------------------------------------------------------------------------
create or replace function public.marcar_ficha_reclamada(p_token text, p_perfil uuid)
returns boolean
language plpgsql volatile security definer set search_path to 'public' as $$
declare v_ficha uuid;
begin
  select i.directorio_id into v_ficha
  from public.directorio_invitaciones i
  where i.token = p_token and i.usada_en is null and i.baja_en is null and i.expira_en > now();

  if v_ficha is null then return false; end if;

  update public.directorio
     set reclamada_por = p_perfil, reclamada_en = now(), actualizada_en = now()
   where id = v_ficha;

  update public.directorio_invitaciones set usada_en = now() where token = p_token;
  return true;
end $$;

revoke all on function public.marcar_ficha_reclamada(text, uuid) from public;
-- Solo la clave de servicio la ejecuta. No se otorga a anon ni a authenticated.

-- ---------------------------------------------------------------------------
-- Crear invitaciones para las fichas publicadas que tengan correo real
-- ---------------------------------------------------------------------------
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

-- Qué quedó listo para enviar
select count(*) as invitaciones_pendientes
from public.directorio_invitaciones
where enviada_en is null and usada_en is null and baja_en is null;
