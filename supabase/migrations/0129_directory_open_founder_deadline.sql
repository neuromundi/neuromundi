-- 0129_directory_open_founder_deadline.sql
-- Desacopla la apertura del directorio de la campaña, y define el plazo de
-- fundador por país (para el contador del panel). campaign_status() devuelve
-- to_jsonb(campaign_config), así que estas columnas fluyen solas al front.
--   directory_open = true → el directorio se muestra SIN cortina y el onboarding
--     (tour/FounderPopup/banner) deja de suprimirse, AUNQUE la campaña y el 50%
--     de fundador sigan activos.
--   founder_deadline_by_country → fecha límite por país para optar por fundador.
alter table public.campaign_config
  add column if not exists directory_open boolean not null default false,
  add column if not exists founder_deadline_by_country jsonb not null default '{}'::jsonb;

update public.campaign_config
   set directory_open = true,
       founder_deadline_by_country = '{"México":"2026-10-31T06:00:00Z"}'::jsonb
 where id = 1;
