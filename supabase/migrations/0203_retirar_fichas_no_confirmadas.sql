-- ===========================================================================
-- 0203 · Las fichas no confirmadas se RETIRAN del directorio, no se degradan.
--
-- Decision de Enyoria (13 oct 2026): una ficha visible sin datos de contacto
-- se lee como falla de Neuromundi y ademas regala publicidad (el usuario
-- encuentra el nombre y lo busca en Google). A partir de verificacion_deadline
-- la ficha del directorio desaparece si no fue confirmada.
--
-- Implementacion: se agrega el predicado al WHERE de la rama `directorio` de
-- la vista directorio_publico. Se reconstruye la vista a partir de su propia
-- definicion para no transcribir a mano sus 100 columnas.
-- ===========================================================================

create or replace function public.ficha_visible(p_reclamada_por uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select now() < public.verificacion_deadline()
      or (p_reclamada_por is not null and public.cuota_cubierta(p_reclamada_por));
$$;

comment on function public.ficha_visible(uuid) is
  'Una ficha del directorio sigue publicada mientras no venza el plazo de verificacion, o si quien la reclamo tiene la cuota cubierta. Despues del plazo, las no confirmadas se retiran.';

revoke all on function public.ficha_visible(uuid) from public;
grant execute on function public.ficha_visible(uuid) to anon, authenticated, service_role;

do $mig$
declare
  v_def text;
begin
  v_def := pg_get_viewdef('public.directorio_publico'::regclass, true);

  -- Guarda: la definicion debe terminar en el WHERE de la rama `directorio`.
  if position('FROM directorio d' in v_def) = 0 then
    raise exception 'directorio_publico no tiene la forma esperada; abortado';
  end if;
  if position('ficha_visible' in v_def) > 0 then
    raise notice 'el predicado ya estaba aplicado; no se cambia nada';
    return;
  end if;

  v_def := rtrim(btrim(v_def), ';');
  v_def := v_def || E'\n  AND public.ficha_visible(d.reclamada_por)';

  execute 'create or replace view public.directorio_publico as ' || v_def;
end
$mig$;
