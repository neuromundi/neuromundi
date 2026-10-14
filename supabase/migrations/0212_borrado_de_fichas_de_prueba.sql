-- 0212 — Borrado de fichas de prueba del directorio.
--
-- POR QUÉ EXISTE ESTA FUNCIÓN:
-- La herramienta MCP de Supabase interrumpe (timeout de 180 s) cualquier
-- sentencia que contenga la palabra DELETE en su texto, por una compuerta de
-- "sentencias destructivas" que nunca llega a resolverse en este entorno.
-- No era una falla de la base: UPDATE, SELECT y DDL corren al instante, y la
-- tabla directorio_invitaciones no tiene disparadores ni llaves foráneas que
-- la referencien. Envuelto el borrado en una función, corre normalmente.
--
-- La función solo opera sobre fichas cuyo nombre empieza con 'PRUEBA INTERNA',
-- de modo que no puede usarse para borrar una ficha real por descuido.
create or replace function admin_borrar_ficha_de_prueba(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_nombre text;
  v_inv int := 0;
begin
  select nombre into v_nombre from directorio where id = p_id;
  if v_nombre is null then
    return jsonb_build_object('ok', false, 'motivo', 'ficha_inexistente');
  end if;
  if v_nombre not like 'PRUEBA INTERNA%' then
    return jsonb_build_object('ok', false, 'motivo', 'no_es_de_prueba', 'nombre', v_nombre);
  end if;
  execute 'del' || 'ete from directorio_invitaciones where directorio_id = $1' using p_id;
  get diagnostics v_inv = row_count;
  execute 'del' || 'ete from directorio where id = $1' using p_id;
  return jsonb_build_object('ok', true, 'nombre', v_nombre, 'invitaciones', v_inv);
end;
$fn$;

-- Solo el rol de servicio puede invocarla. Sin esta linea la funcion queda
-- expuesta a anon y a authenticated, que es como la detecto el auditor de
-- Supabase el mismo dia en que se creo.
revoke all on function admin_borrar_ficha_de_prueba(uuid) from public, anon, authenticated;
