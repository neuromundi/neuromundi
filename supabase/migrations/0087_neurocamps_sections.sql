-- 0087_neurocamps_sections.sql
-- Neurocamps (antes "Tribu"): un Neurocamp propio por cada sección de la
-- plataforma. Se añade la dimensión `section` a los foros, eventos y mentores,
-- de modo que cada contenido pertenezca a un Neurocamp:
--   neurodesarrollo | neurodivergencias | afecciones   (NULL = general, en todos)
-- Idempotente.

alter table public.tribe_forums  add column if not exists section text;
alter table public.tribe_events  add column if not exists section text;
alter table public.tribe_mentors add column if not exists section text;

-- Restringe a los valores válidos (o NULL). Idempotente vía guardas.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'tribe_forums_section_chk') then
    alter table public.tribe_forums add constraint tribe_forums_section_chk
      check (section is null or section in ('neurodesarrollo','neurodivergencias','afecciones'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tribe_events_section_chk') then
    alter table public.tribe_events add constraint tribe_events_section_chk
      check (section is null or section in ('neurodesarrollo','neurodivergencias','afecciones'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tribe_mentors_section_chk') then
    alter table public.tribe_mentors add constraint tribe_mentors_section_chk
      check (section is null or section in ('neurodesarrollo','neurodivergencias','afecciones'));
  end if;
end $$;

create index if not exists idx_tribe_forums_section  on public.tribe_forums (section);
create index if not exists idx_tribe_events_section  on public.tribe_events (section);
create index if not exists idx_tribe_mentors_section on public.tribe_mentors (section);

-- ── Listado de foros por Neurocamp (sección) ─────────────────────────────────
-- Cambia la firma (nuevo parámetro) y la tabla de salida (nueva columna): hay
-- que soltar la versión previa antes de recrear.
drop function if exists public.tribe_forums_list(text, text, text, text);
create or replace function public.tribe_forums_list(
  p_query text default null, p_country text default null,
  p_language text default null, p_theme text default null,
  p_section text default null
)
returns table (
  id uuid, title text, description text, theme text, country text, city text,
  language text, section text, members bigint, i_member boolean, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    f.id, f.title, f.description, f.theme, f.country, f.city, f.language, f.section,
    (select count(*) from public.tribe_forum_members fm where fm.forum_id = f.id),
    exists (select 1 from public.tribe_forum_members fm where fm.forum_id = f.id and fm.user_id = auth.uid()),
    f.created_at
  from public.tribe_forums f
  where f.status = 'approved'
    and public.is_tribe_active()
    and (p_country  is null or p_country  = '' or f.country  = p_country)
    and (p_language is null or p_language = '' or f.language = p_language)
    and (p_theme    is null or p_theme    = '' or f.theme    = p_theme)
    and (p_section  is null or p_section  = '' or f.section is null or f.section = p_section)
    and (p_query    is null or p_query    = '' or f.title ilike '%'||p_query||'%' or f.description ilike '%'||p_query||'%')
  order by f.created_at desc;
$$;
grant execute on function public.tribe_forums_list(text, text, text, text, text) to authenticated;

-- ── Crear foro dentro de un Neurocamp (sección opcional) ─────────────────────
drop function if exists public.tribe_create_forum(text, text, text, text, text, text, text[], boolean);
create or replace function public.tribe_create_forum(
  p_title text, p_description text, p_theme text, p_country text, p_city text,
  p_language text, p_notify_countries text[], p_apply_moderator boolean default false,
  p_section text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'no autenticado'; end if;
  if not public.is_tribe_active() then raise exception 'no eres miembro activo'; end if;
  if length(coalesce(trim(p_title), '')) < 3 then raise exception 'título muy corto'; end if;
  if p_section is not null and p_section <> '' and p_section not in ('neurodesarrollo','neurodivergencias','afecciones') then
    raise exception 'sección inválida';
  end if;

  insert into public.tribe_forums (creator_id, title, description, theme, country, city, language, notify_countries, section, status)
  values (v_uid, trim(p_title), nullif(p_description, ''), nullif(p_theme, ''), nullif(p_country, ''), nullif(p_city, ''),
          nullif(p_language, ''),
          case when p_notify_countries is null or array_length(p_notify_countries, 1) is null then null else p_notify_countries end,
          nullif(p_section, ''),
          'pending')
  returning id into v_id;

  insert into public.notifications (user_id, type, title, body, data)
  values (v_uid, 'forum_pending', 'Foro en revisión', '', jsonb_build_object('forum_id', v_id, 'title', trim(p_title)));

  if coalesce(p_apply_moderator, false)
     and exists (select 1 from public.tribe_moderators m where m.user_id = v_uid and m.status = 'approved') then
    insert into public.tribe_forum_moderators (forum_id, user_id, status)
    values (v_id, v_uid, 'pending')
    on conflict (forum_id, user_id) do nothing;
  end if;

  return v_id;
end; $$;
grant execute on function public.tribe_create_forum(text, text, text, text, text, text, text[], boolean, text) to authenticated;
