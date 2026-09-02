-- ============================================================================
-- Verificación de migraciones recientes (0077 → 0088) en producción — Neuromundi
-- Pega TODO en el SQL Editor de Supabase y ejecútalo. Devuelve una fila por
-- objeto esperado con estado OK / FALTA. Los FALTA salen primero.
--
-- Señales usadas (por fiabilidad):
--   · table  → la tabla existe.
--   · column → la columna existe (prueba definitiva de que la migración corrió).
--   · funcargs → existe una función public.<nombre> con EXACTAMENTE N argumentos
--                de entrada. Se usa para las RPC que solo cambiaron de firma
--                (0087/0088 recrean funciones con un parámetro p_section extra):
--                si el nº de args coincide con el NUEVO, la migración se aplicó.
--   · function → la función existe por nombre (para funciones nuevas de por sí).
-- ============================================================================
with expected(migration, kind, name, nargs) as (
  values
    ('0077_promo_discounts',        'column',   'promo_codes.benefit',              null),
    ('0077_promo_discounts',        'column',   'promo_codes.percent_off',          null),
    ('0078_promo_amount_email',     'column',   'promo_codes.bound_email',          null),
    ('0078_promo_amount_email',     'function', 'membership_promo',                 null),
    ('0079_advisor',                'column',   'profiles.is_advisor',              null),
    ('0079_advisor',                'function', 'is_advisor',                       null),
    ('0080_tribe_forums_plus',      'table',    'tribe_forum_moderators',           null),
    ('0080_tribe_forums_plus',      'table',    'tribe_forum_prefs',                null),
    ('0080_tribe_forums_plus',      'column',   'tribe_forums.notify_countries',    null),
    ('0081_campaign',               'table',    'campaign_config',                  null),
    ('0081_campaign',               'function', 'campaign_status',                  null),
    ('0082_campaign_founder_disc',  'column',   'campaign_config.founder_discount', null),
    ('0083_campaign_emails',        'table',    'campaign_emails',                  null),
    ('0083_campaign_emails',        'function', 'campaign_welcome_queue',           null),
    ('0084_raffle_tickets',         'table',    'raffle_tickets',                   null),
    ('0084_raffle_tickets',         'function', 'my_raffle_tickets',                null),
    ('0085_campaign_community',     'table',    'raffle_winners',                   null),
    ('0085_campaign_community',     'column',   'campaign_config.community_url',    null),
    ('0085_campaign_community',     'function', 'admin_raffle_draw',                null),
    ('0086_platform_sections',      'column',   'profiles.sections',                null),
    ('0086_platform_sections',      'column',   'profiles.neuro_conditions',        null),
    -- 0087: dimensión de sección en Neurocamps + RPC de foros recreadas.
    ('0087_neurocamps_sections',    'column',   'tribe_forums.section',             null),
    ('0087_neurocamps_sections',    'column',   'tribe_events.section',             null),
    ('0087_neurocamps_sections',    'column',   'tribe_mentors.section',            null),
    ('0087_neurocamps_sections',    'funcargs', 'tribe_forums_list',                5),
    ('0087_neurocamps_sections',    'funcargs', 'tribe_create_forum',               9),
    -- 0088: eventos y mentoría recreadas con p_section (solo cambian firmas).
    ('0088_neurocamps_events_ment', 'funcargs', 'tribe_events_list',                2),
    ('0088_neurocamps_events_ment', 'funcargs', 'tribe_create_event',               11),
    ('0088_neurocamps_events_ment', 'funcargs', 'tribe_become_mentor',              3),
    ('0088_neurocamps_events_ment', 'funcargs', 'tribe_mentors_list',               2)
),
checked as (
  select e.*,
    case e.kind
      when 'table'    then (to_regclass('public.' || e.name) is not null)
      when 'column'   then exists (
                             select 1 from information_schema.columns c
                             where c.table_schema = 'public'
                               and c.table_name  = split_part(e.name, '.', 1)
                               and c.column_name = split_part(e.name, '.', 2))
      when 'function' then exists (
                             select 1 from pg_proc p
                             join pg_namespace n on n.oid = p.pronamespace
                             where n.nspname = 'public' and p.proname = e.name)
      when 'funcargs' then exists (
                             select 1 from pg_proc p
                             join pg_namespace n on n.oid = p.pronamespace
                             where n.nspname = 'public' and p.proname = e.name
                               and p.pronargs = e.nargs)
      else false
    end as present
  from expected e
)
select migration, kind, name,
       coalesce(nargs::text, '') as args,
       case when present then 'OK' else 'FALTA' end as estado
from checked
order by present asc, migration, kind, name;
