-- ===========================================================================
-- 0206 · El admin puede republicar fichas retiradas por vencimiento.
--
-- Pedido de Enyoria (14 oct 2026). Desde 0203, al vencer verificacion_deadline
-- la ficha no confirmada desaparece de directorio_publico. Esa decision la
-- toma un predicado, no una columna, asi que hasta ahora no habia forma de
-- exceptuar a una ficha concreta: o se movia el plazo para todos, o nada.
--
-- Se agrega una bandera explicita. La vista pasa a mostrar la ficha si:
--     publicacion_forzada  O  ficha_visible(reclamada_por)
-- El resto de las guardas (estado_revision, baja_solicitada, perfil reclamante
-- ya publicado) siguen igual: republicar NO revive una ficha dada de baja.
--
-- NOTA: se aplico en dos migraciones (0206 y 0206b) porque el canal MCP agota
-- su tiempo con payloads largos. Este archivo es el equivalente completo.
-- ===========================================================================

alter table public.directorio
  add column if not exists publicacion_forzada boolean not null default false,
  add column if not exists publicacion_forzada_por uuid references public.profiles(id),
  add column if not exists publicacion_forzada_en timestamptz,
  add column if not exists publicacion_forzada_nota text;

comment on column public.directorio.publicacion_forzada is
  'El admin decidio que esta ficha sigue publicada aunque no se haya confirmado al vencer el plazo (migracion 0206).';

create index if not exists directorio_publicacion_forzada_idx
  on public.directorio (publicacion_forzada) where publicacion_forzada;

do $mig$
declare v_def text;
begin
  v_def := pg_get_viewdef('public.directorio_publico'::regclass, true);
  if position('publicacion_forzada' in v_def) > 0 then
    raise notice 'la vista ya contempla publicacion_forzada';
    return;
  end if;
  if position('ficha_visible(d.reclamada_por)' in v_def) = 0 then
    raise exception 'directorio_publico no tiene el predicado de 0203; abortado';
  end if;
  v_def := replace(v_def, 'ficha_visible(d.reclamada_por)',
                   '(d.publicacion_forzada OR ficha_visible(d.reclamada_por))');
  execute 'create or replace view public.directorio_publico as ' || rtrim(btrim(v_def), ';');
end
$mig$;
