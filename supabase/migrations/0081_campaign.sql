-- 0081_campaign.sql
-- Campaña de pre-registro: bloqueo temporal del directorio + control de popups.
-- Configuración editable por el admin SIN recompilar (una sola fila, id=1).
--   · active               interruptor maestro de la campaña.
--   · start_at             inicio del bloqueo (ej. 2026-08-10 00:00 CDMX = 06:00 UTC).
--   · default_block_days   duración del bloqueo por defecto (90).
--   · block_days_by_country overrides por país (nombre ES), ej. {"México": 30}.
--   · popup_active         interruptor del popup de bienvenida de campaña (fase 3).
--   · popup_continents     activación del popup por continente {"América": true, ...}.
-- El front calcula, para el país del visitante: unlock = start_at + días; está
-- bloqueado si active y now está entre start_at y unlock. Admin y asesor exentos
-- (se resuelve en el front). Idempotente.

create table if not exists public.campaign_config (
  id                    smallint primary key default 1,
  active                boolean not null default false,
  start_at              timestamptz,
  default_block_days    integer not null default 90,
  block_days_by_country jsonb   not null default '{"México": 30}'::jsonb,
  popup_active          boolean not null default false,
  popup_continents      jsonb   not null default '{}'::jsonb,
  updated_at            timestamptz not null default now(),
  constraint campaign_config_singleton check (id = 1)
);

-- Semilla con los valores de esta campaña (activa; el bloqueo real arranca en
-- start_at). El admin puede ajustar todo desde el panel.
insert into public.campaign_config (id, active, start_at, default_block_days, block_days_by_country)
values (1, true, '2026-08-10T06:00:00Z', 90, '{"México": 30}'::jsonb)
on conflict (id) do nothing;

alter table public.campaign_config enable row level security;
-- Lectura pública (es información de marketing, nada sensible).
drop policy if exists campaign_read on public.campaign_config;
create policy campaign_read on public.campaign_config for select using (true);
-- La escritura va SOLO por RPC admin (sin policy de update para usuarios).

-- Estado de la campaña (público): el front lo lee para calcular el bloqueo.
create or replace function public.campaign_status()
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(c) from public.campaign_config c where c.id = 1;
$$;
grant execute on function public.campaign_status() to anon, authenticated;

-- Guardado por el admin.
create or replace function public.admin_campaign_set(
  p_active boolean,
  p_start_at timestamptz,
  p_default_days integer,
  p_days_by_country jsonb,
  p_popup_active boolean,
  p_popup_continents jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'solo administradores'; end if;
  update public.campaign_config set
    active                = coalesce(p_active, active),
    start_at              = p_start_at,
    default_block_days    = coalesce(p_default_days, default_block_days),
    block_days_by_country = coalesce(p_days_by_country, block_days_by_country),
    popup_active          = coalesce(p_popup_active, popup_active),
    popup_continents      = coalesce(p_popup_continents, popup_continents),
    updated_at            = now()
  where id = 1;
end; $$;
grant execute on function public.admin_campaign_set(boolean, timestamptz, integer, jsonb, boolean, jsonb) to authenticated;
