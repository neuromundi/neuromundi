-- ============================================================================
-- Panel admin: valores "Otro (especifica)" más usados y su promoción a categoría
-- ----------------------------------------------------------------------------
-- Los registrantes escriben opciones no listadas en provider_details (claves
-- que terminan en `_other`). Estos RPC permiten a un admin:
--   1) ver los "otros" más usados (opcionalmente por país), y
--   2) convertir uno en categoría real (tabla categories) con un clic, enlazando
--      a los proveedores que lo escribieron.
-- Ambos son SECURITY DEFINER y exigen is_admin() (mismo patrón que admin_set_*).
-- Idempotente.
-- ============================================================================

-- 1) Agregación de los "_other" de proveedores publicados.
create or replace function public.admin_other_values(p_country text default null)
returns table (
  country      text,
  kind         text,
  label        text,
  uses         integer,
  provider_ids uuid[],
  category_id  integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query
  with raw as (
    select
      pr.country                      as country,
      e.key                           as kind,
      btrim(e.value)                  as label,
      pr.id                           as provider_id
    from public.profiles pr
    cross join lateral jsonb_each_text(coalesce(pr.provider_details, '{}'::jsonb)) as e(key, value)
    where pr.role = 'provider'
      and pr.is_published = true
      and e.key like '%\_other' escape '\'
      and btrim(e.value) <> ''
      and (p_country is null or pr.country = p_country)
  )
  select
    r.country,
    r.kind,
    min(r.label)                                   as label,
    count(distinct r.provider_id)::int             as uses,
    array_agg(distinct r.provider_id)              as provider_ids,
    (select c.id from public.categories c
      where lower(c.name) = lower(min(r.label)) limit 1) as category_id
  from raw r
  group by r.country, r.kind, lower(r.label)
  order by count(distinct r.provider_id) desc, min(r.label) asc;
end;
$$;

revoke all on function public.admin_other_values(text) from public, anon;
grant execute on function public.admin_other_values(text) to authenticated;

-- 2) Promoción de un "otro" a categoría (crea la categoría si no existe y enlaza
--    a los proveedores que lo escribieron). Devuelve el id de la categoría.
create or replace function public.admin_promote_other_to_category(
  p_label   text,
  p_country text default null,
  p_kind    text default null,
  p_link    boolean default true
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cat_id integer;
  v_slug   text;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  if btrim(coalesce(p_label, '')) = '' then
    raise exception 'empty label';
  end if;

  -- ¿Ya existe una categoría con ese nombre?
  select id into v_cat_id
  from public.categories
  where lower(name) = lower(btrim(p_label))
  limit 1;

  -- Si no existe, la creamos con un slug único.
  if v_cat_id is null then
    v_slug := btrim(regexp_replace(lower(btrim(p_label)), '[^a-z0-9]+', '-', 'g'), '-');
    if v_slug = '' then v_slug := 'cat'; end if;
    if exists (select 1 from public.categories where slug = v_slug) then
      v_slug := v_slug || '-' || floor(random() * 100000)::text;
    end if;
    insert into public.categories (slug, name, sort_order)
    values (v_slug, btrim(p_label),
            coalesce((select max(sort_order) from public.categories), 0) + 1)
    returning id into v_cat_id;
  end if;

  -- Enlazamos a los proveedores que escribieron ese "otro".
  if p_link then
    insert into public.provider_categories (provider_id, category_id)
    select distinct pr.id, v_cat_id
    from public.profiles pr
    cross join lateral jsonb_each_text(coalesce(pr.provider_details, '{}'::jsonb)) as e(key, value)
    where pr.role = 'provider'
      and e.key like '%\_other' escape '\'
      and lower(btrim(e.value)) = lower(btrim(p_label))
      and (p_kind is null or e.key = p_kind)
      and (p_country is null or pr.country = p_country)
      and not exists (
        select 1 from public.provider_categories pc
        where pc.provider_id = pr.id and pc.category_id = v_cat_id
      );
  end if;

  return v_cat_id;
end;
$$;

revoke all on function public.admin_promote_other_to_category(text, text, text, boolean) from public, anon;
grant execute on function public.admin_promote_other_to_category(text, text, text, boolean) to authenticated;
