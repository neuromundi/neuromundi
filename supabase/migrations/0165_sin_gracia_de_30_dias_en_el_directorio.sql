-- 0165: elimina la ventana de 30 dias que mostraba en el directorio a perfiles
-- 'pending' sin publicar, sin completar y sin pagar. Con la regla nueva,
-- aparecer en el directorio exige perfil publicado, y publicar exige
-- completitud + cuota cubierta (0163).
do $$
declare v_def text; v_nuevo text; v_ante int; v_post int; v_hits int;
begin
  select count(*) into v_ante
    from information_schema.columns
   where table_schema='public' and table_name='directorio_publico';
  if v_ante <> 100 then
    raise exception 'la vista tiene % columnas, se esperaban 100', v_ante;
  end if;

  v_def := rtrim(btrim(pg_get_viewdef('public.directorio_publico'::regclass, true)), ';');

  select count(*) into v_hits from regexp_matches(
    v_def,
    'OR p\.membership_status = ''pending''::text AND now\(\) < COALESCE\(.*?''30 days''::interval\)',
    'gs');
  if v_hits <> 1 then
    raise exception 'ancla ambigua: % ocurrencias de la rama de gracia', v_hits;
  end if;

  v_nuevo := regexp_replace(
    v_def,
    'OR p\.membership_status = ''pending''::text AND now\(\) < COALESCE\(.*?''30 days''::interval\)',
    '',
    'gs');

  execute 'create or replace view public.directorio_publico as ' || v_nuevo;

  select count(*) into v_post
    from information_schema.columns
   where table_schema='public' and table_name='directorio_publico';
  if v_post <> 100 then
    raise exception 'tras el cambio la vista tiene % columnas', v_post;
  end if;
end $$;
