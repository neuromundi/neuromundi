-- 0166: la ficha conserva sus datos de contacto solo mientras no venza el plazo
-- o mientras quien la reclamó tenga la cuota cubierta. La verificación manual
-- acredita exactitud del dato, no derecho a mostrar contacto.
-- Se amplía lo que se oculta: telefono, sitio web, domicilio y coordenadas.
-- Ciudad y estado se conservan siempre, para que la ficha siga siendo
-- encontrable y filtrable.
-- En la rama de perfiles, 'past_due' deja de bastar: cuenta el periodo pagado.

create or replace function public.ficha_contacto_visible(p_reclamada_por uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select now() < public.verificacion_deadline()
      or (p_reclamada_por is not null and public.cuota_cubierta(p_reclamada_por));
$$;

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

  -- 1) guardas de contacto de la ficha (telefono, website_url, website)
  select count(*) into n from regexp_matches(v_def,
    'WHEN d\.reclamada_por IS NOT NULL OR COALESCE\(d\.verificada_manual, false\) OR now\(\) < verificacion_deadline\(\) THEN', 'g');
  if n <> 3 then raise exception 'se esperaban 3 guardas de contacto, hay %', n; end if;
  v_def := replace(v_def,
    'WHEN d.reclamada_por IS NOT NULL OR COALESCE(d.verificada_manual, false) OR now() < verificacion_deadline() THEN',
    'WHEN public.ficha_contacto_visible(d.reclamada_por) THEN');

  -- 2) domicilio y coordenadas, hasta ahora sin guarda
  select count(*) into n from regexp_matches(v_def, 'd\.direccion AS address', 'g');
  if n <> 1 then raise exception 'ancla address: % ocurrencias', n; end if;
  v_def := replace(v_def, 'd.direccion AS address',
    'CASE WHEN public.ficha_contacto_visible(d.reclamada_por) THEN d.direccion ELSE NULL END AS address');

  select count(*) into n from regexp_matches(v_def, 'd\.lat AS latitude', 'g');
  if n <> 1 then raise exception 'ancla latitude: % ocurrencias', n; end if;
  v_def := replace(v_def, 'd.lat AS latitude',
    'CASE WHEN public.ficha_contacto_visible(d.reclamada_por) THEN d.lat ELSE NULL END AS latitude');

  select count(*) into n from regexp_matches(v_def, 'd\.lng AS longitude', 'g');
  if n <> 1 then raise exception 'ancla longitude: % ocurrencias', n; end if;
  v_def := replace(v_def, 'd.lng AS longitude',
    'CASE WHEN public.ficha_contacto_visible(d.reclamada_por) THEN d.lng ELSE NULL END AS longitude');

  -- 3) perfiles: el impago posterior cae al nivel de quien nunca pago
  select count(*) into n from regexp_matches(v_def,
    'p\.membership_status = ANY \(ARRAY\[''active''::text, ''exempt''::text, ''past_due''::text\]\)', 'g');
  if n <> 1 then raise exception 'ancla membresia de perfiles: % ocurrencias', n; end if;
  v_def := replace(v_def,
    'p.membership_status = ANY (ARRAY[''active''::text, ''exempt''::text, ''past_due''::text])',
    '(p.membership_status = ANY (ARRAY[''active''::text, ''exempt''::text]) OR p.membership_paid_until IS NOT NULL AND p.membership_paid_until > now())');

  execute 'create or replace view public.directorio_publico as ' || v_def;

  select count(*) into v_post
    from information_schema.columns
   where table_schema='public' and table_name='directorio_publico';
  if v_post <> 100 then
    raise exception 'tras el cambio la vista tiene % columnas', v_post;
  end if;
end $$;
