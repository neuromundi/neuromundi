-- 0164: una ficha reclamada deja de mostrarse solo cuando el perfil que la
-- reclamó ya está publicado. Evita que alguien desaparezca del directorio
-- entre el reclamo y el cumplimiento de los requisitos de publicación.
do $$
declare v_def text; v_ante int; v_post int; v_ocurrencias int;
begin
  select count(*) into v_ante
    from information_schema.columns
   where table_schema='public' and table_name='directorio_publico';
  if v_ante <> 100 then
    raise exception 'la vista tiene % columnas, se esperaban 100', v_ante;
  end if;

  v_def := rtrim(btrim(pg_get_viewdef('public.directorio_publico'::regclass, true)), ';');

  select count(*) into v_ocurrencias
    from regexp_matches(v_def, 'd\.reclamada_por IS NULL', 'g');
  if v_ocurrencias <> 1 then
    raise exception 'ancla ambigua: % ocurrencias de "d.reclamada_por IS NULL"', v_ocurrencias;
  end if;

  v_def := replace(v_def,
    'd.reclamada_por IS NULL',
    '(d.reclamada_por IS NULL OR NOT (EXISTS ( SELECT 1 FROM profiles pc WHERE pc.id = d.reclamada_por AND pc.is_published)))');

  execute 'create or replace view public.directorio_publico as ' || v_def;

  select count(*) into v_post
    from information_schema.columns
   where table_schema='public' and table_name='directorio_publico';
  if v_post <> 100 then
    raise exception 'tras el cambio la vista tiene % columnas', v_post;
  end if;
end $$;
