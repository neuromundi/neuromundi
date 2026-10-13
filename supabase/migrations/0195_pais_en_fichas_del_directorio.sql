-- 0195: las fichas del directorio no tenían país.
--
-- `directorio` no tiene columna de país y la rama de fichas de
-- directorio_publico entregaba 'México'::text fijo para las 1026 fichas. Con
-- eso, una ficha de Argentina o de Chile se sirve al frontend como mexicana y
-- queda invisible bajo el filtro de su propio país. Es el requisito que
-- bloqueaba abrir el directorio al resto de América Latina.
--
-- Las 1026 fichas existentes son mexicanas (se construyeron del DENUE y de
-- búsquedas en México), así que el relleno retroactivo es 'México'.

alter table public.directorio
  add column if not exists pais text;

update public.directorio set pais = 'México' where pais is null;

alter table public.directorio
  alter column pais set default 'México',
  alter column pais set not null;

comment on column public.directorio.pais is
  'País de la ficha. Debe coincidir con un valor de campaign_config.active_markets para que el filtro de país del directorio la encuentre.';

create index if not exists directorio_pais_idx on public.directorio (pais);

do $$
declare v_def text; v_ante int; v_post int; n int;
begin
  select count(*) into v_ante
    from information_schema.columns
   where table_schema='public' and table_name='directorio_publico';
  if v_ante <> 100 then
    raise exception 'la vista tiene % columnas, se esperaban 100', v_ante;
  end if;

  v_def := rtrim(btrim(pg_get_viewdef('public.directorio_publico'::regclass, true)), ';');

  select count(*) into n from regexp_matches(v_def, '''México''::text AS country', 'g');
  if n <> 1 then raise exception 'ancla de pais: % ocurrencias, se esperaba 1', n; end if;

  v_def := replace(v_def, '''México''::text AS country', 'd.pais AS country');

  execute 'create or replace view public.directorio_publico as ' || v_def;

  select count(*) into v_post
    from information_schema.columns
   where table_schema='public' and table_name='directorio_publico';
  if v_post <> 100 then
    raise exception 'tras el cambio la vista tiene % columnas', v_post;
  end if;
end $$;
