-- 0272: la bandera `ubicacion_aproximada` llega hasta la interfaz.
--
-- La 0271 le puso a 1,044 fichas la coordenada del centro de su ciudad. Esa
-- coordenada NO es el domicilio del prestador, que nunca lo publico. Si la
-- interfaz no puede distinguirla de una direccion real, acaba ofreciendo
-- "Como llegar" hacia un punto inventado, que es peor que no tener mapa.
--
-- Por eso la bandera tiene que viajar por las dos vistas publicas:
--   · en la mitad de `profiles` vale false, porque quien reclamo su ficha y
--     escribio su direccion tiene coordenada real;
--   · en la mitad de `directorio` se expone tal cual.
--
-- El cambio se hace por sustitucion de texto sobre la definicion viva, no
-- reescribiendo a mano las ~70 columnas, y cada ancla se verifica: si no
-- aparece exactamente una vez, aborta sin tocar nada. Es idempotente: si la
-- columna ya esta expuesta, no vuelve a tocar la vista.

do $mig$
declare
  v_def text;
  v_veces int;
begin
  -- ---- 1. directorio_publico: una columna nueva al final de cada mitad ----
  select pg_get_viewdef('public.directorio_publico'::regclass, true) into v_def;

  if position('ubicacion_aproximada' in v_def) > 0 then
    raise notice 'directorio_publico ya expone ubicacion_aproximada; no se toca.';
  else
    v_veces := (length(v_def) - length(replace(v_def, E'\n   FROM profiles p', ''))) / length(E'\n   FROM profiles p');
    if v_veces <> 1 then
      raise exception 'Se esperaba una sola mitad de profiles en directorio_publico y hay %. No se toco la vista.', v_veces;
    end if;

    v_veces := (length(v_def) - length(replace(v_def, E'\n   FROM directorio d', ''))) / length(E'\n   FROM directorio d');
    if v_veces <> 1 then
      raise exception 'Se esperaba una sola mitad de directorio en directorio_publico y hay %. No se toco la vista.', v_veces;
    end if;

    v_def := replace(v_def, E'\n   FROM profiles p',
                     E',\n    false AS ubicacion_aproximada\n   FROM profiles p');
    v_def := replace(v_def, E'\n   FROM directorio d',
                     E',\n    d.ubicacion_aproximada\n   FROM directorio d');

    execute 'create or replace view public.directorio_publico as ' || rtrim(v_def, E';\n ');
  end if;

  -- ---- 2. directorio_publico_seguro: la deja pasar ----
  select pg_get_viewdef('public.directorio_publico_seguro'::regclass, true) into v_def;

  if position('ubicacion_aproximada' in v_def) > 0 then
    raise notice 'directorio_publico_seguro ya expone ubicacion_aproximada; no se toca.';
  else
    v_veces := (length(v_def) - length(replace(v_def, E'\n   FROM directorio_publico', ''))) / length(E'\n   FROM directorio_publico');
    if v_veces <> 1 then
      raise exception 'Se esperaba un solo FROM directorio_publico y hay %. No se toco la vista.', v_veces;
    end if;

    v_def := replace(v_def, E'\n   FROM directorio_publico',
                     E',\n    ubicacion_aproximada\n   FROM directorio_publico');

    execute 'create or replace view public.directorio_publico_seguro as ' || rtrim(v_def, E';\n ');
  end if;
end
$mig$;
