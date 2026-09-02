-- 0082_campaign_founder_discount.sql
-- Campaña (Fase 2): descuento de fundador por ETAPA sobre la membresía anual.
-- Se guarda en campaign_config como un arreglo de etapas ordenadas por días:
--   [{"days":15,"pct":50},{"days":30,"pct":25}]
-- Significa: pagando dentro de los primeros 15 días → 50%; entre el 16 y el 30 →
-- 25%; después → 0%. El checkout lo aplica SOLO al periodo anual, combinándolo de
-- forma compuesta con los descuentos de recomendación y de código promo (tope 90%).
-- Editable por el admin. Idempotente. Aplicar tras 0081.

alter table public.campaign_config
  add column if not exists founder_discount jsonb not null
  default '[{"days":15,"pct":50},{"days":30,"pct":25}]'::jsonb;

-- Recreamos admin_campaign_set con el parámetro extra (drop del 6-args previo).
drop function if exists public.admin_campaign_set(boolean, timestamptz, integer, jsonb, boolean, jsonb);

create or replace function public.admin_campaign_set(
  p_active boolean,
  p_start_at timestamptz,
  p_default_days integer,
  p_days_by_country jsonb,
  p_popup_active boolean,
  p_popup_continents jsonb,
  p_founder_discount jsonb
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
    founder_discount      = coalesce(p_founder_discount, founder_discount),
    updated_at            = now()
  where id = 1;
end; $$;
grant execute on function public.admin_campaign_set(boolean, timestamptz, integer, jsonb, boolean, jsonb, jsonb) to authenticated;
