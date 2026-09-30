-- ============================================================================
-- 0154 · Fichas «sin verificar»: degradación derivada, sin proceso programado
--
-- QUÉ PROMETIÓ EL CORREO
--   «15 de noviembre de 2026 — último día para confirmar su ficha. Confirmar es
--    gratuito. Las fichas que nadie confirme quedarán marcadas como sin
--    verificar: seguirán apareciendo, pero sin teléfono, sin correo y sin sitio
--    web, y por debajo de los perfiles verificados.»
--
--   Eso se comprometió por escrito ante los destinatarios de la campaña. Esta
--   migración lo construye.
--
-- POR QUÉ NO HAY TRABAJO NOCTURNO
--   Marcar fichas con un proceso programado introduce estado que puede fallar,
--   correr dos veces, quedarse a medias, y que hay que REVERTIR en cuanto
--   alguien confirma. En vez de eso, el estado se DERIVA al consultar:
--
--     verificada = reclamada_por is not null  or  verificada_manual
--
--   En cuanto alguien reclama su ficha, sus datos reaparecen en la siguiente
--   consulta. Nada que ejecutar, nada que revertir, nada que se desincronice.
--
-- LA FECHA
--   `campaign_config.verificacion_deadline`, editable como el plazo de fundador.
--   Se fija el 16 de noviembre a las 00:00 CDMX, NO el 15: el correo dice que
--   el 15 es el último día para confirmar, así que confirmar ese día debe
--   contar. Es la misma lección que el corte del 31 de octubre.
--
-- CÓMO SE RECREA LA VISTA
--   `directorio_publico` tiene 99 columnas en dos ramas unidas por UNION ALL.
--   Transcribirlas a mano fue lo que rompió la migración 0137. Aquí la vista
--   nueva se GENERA a partir de la vigente (pg_get_viewdef) con reemplazos
--   acotados, y cada reemplazo verifica que encontró su ancla: si el texto
--   cambió, la migración falla en vez de producir una vista silenciosamente mal
--   formada.
--
--   Se usa CREATE OR REPLACE VIEW, no DROP: añadir una columna AL FINAL está
--   permitido, y así no se pierden permisos ni dependencias.
--
-- Idempotente. NO envía nada.
-- ============================================================================

alter table public.directorio
  add column if not exists verificada_manual boolean not null default false;

comment on column public.directorio.verificada_manual is
  'El admin confirmó esta ficha por fuera de la plataforma (teléfono, WhatsApp). '
  'Cuenta como verificada aunque nadie la haya reclamado.';

alter table public.campaign_config
  add column if not exists verificacion_deadline timestamptz
  not null default '2026-11-16T06:00:00Z';

comment on column public.campaign_config.verificacion_deadline is
  'Desde esta fecha, las fichas sin confirmar ocultan teléfono y sitio web. '
  '16 nov 00:00 CDMX = el día 15 completo sigue contando para confirmar.';

create or replace function public.verificacion_deadline()
returns timestamptz language sql stable security definer set search_path = public as $$
  select verificacion_deadline from public.campaign_config where id = 1;
$$;

grant execute on function public.verificacion_deadline() to anon, authenticated;

-- ── Recreación generada de la vista ─────────────────────────────────────────
do $mig$
declare
  v_def  text;
  v_ante int;
  v_post int;
  -- Una ficha muestra sus datos de contacto si está verificada O si el plazo
  -- todavía no llega. Se repite en las tres columnas de contacto.
  c_ok constant text :=
    'd.reclamada_por is not null or coalesce(d.verificada_manual, false) '
    'or now() < public.verificacion_deadline()';
begin
  select count(*) into v_ante from information_schema.columns
   where table_schema='public' and table_name='directorio_publico';
  if v_ante <> 99 then
    raise exception 'directorio_publico tiene % columnas; esta migración se escribió para 99. Revisar antes de continuar.', v_ante;
  end if;

  v_def := rtrim(btrim(pg_get_viewdef('public.directorio_publico'::regclass, true)), ';');

  -- (1) Rama de PERFILES: una cuenta real siempre cuenta como verificada.
  if position('ARRAY[p.provider_type] AS provider_types' in v_def) = 0 then
    raise exception 'ancla no encontrada: cierre de la rama de perfiles';
  end if;
  v_def := replace(v_def,
    'ARRAY[p.provider_type] AS provider_types',
    'ARRAY[p.provider_type] AS provider_types,' || chr(10) || '    true AS verificada');

  -- (2) Rama de FICHAS: verificada = reclamada o confirmada a mano.
  if position('d.provider_types' || chr(10) || '   FROM directorio d' in v_def) = 0 then
    raise exception 'ancla no encontrada: cierre de la rama de fichas';
  end if;
  v_def := replace(v_def,
    'd.provider_types' || chr(10) || '   FROM directorio d',
    'd.provider_types,' || chr(10)
    || '    (d.reclamada_por is not null or coalesce(d.verificada_manual, false)) AS verificada'
    || chr(10) || '   FROM directorio d');

  -- (3) Teléfono y sitio web: se ocultan si no está verificada y ya pasó el plazo.
  if position('d.telefono AS phone' in v_def) = 0
     or position('d.sitio_web AS website_url' in v_def) = 0
     or position('d.sitio_web AS website' in v_def) = 0 then
    raise exception 'ancla no encontrada: columnas de contacto de la rama de fichas';
  end if;
  v_def := replace(v_def, 'd.telefono AS phone',
    'case when ' || c_ok || ' then d.telefono else null::text end AS phone');
  v_def := replace(v_def, 'd.sitio_web AS website_url',
    'case when ' || c_ok || ' then d.sitio_web else null::text end AS website_url');
  v_def := replace(v_def, 'd.sitio_web AS website,',
    'case when ' || c_ok || ' then d.sitio_web else null::text end AS website,');

  execute 'create or replace view public.directorio_publico as ' || v_def;

  select count(*) into v_post from information_schema.columns
   where table_schema='public' and table_name='directorio_publico';
  if v_post <> 100 then
    raise exception 'la vista quedó con % columnas, se esperaban 100', v_post;
  end if;
end $mig$;

-- ── Control del admin ───────────────────────────────────────────────────────
create or replace function public.admin_set_ficha_verificada(p_id uuid, p_value boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'solo administradores';
  end if;
  update public.directorio
     set verificada_manual = coalesce(p_value, false), actualizada_en = now()
   where id = p_id;
  return found;
end $$;

revoke all on function public.admin_set_ficha_verificada(uuid, boolean) from public, anon;
grant execute on function public.admin_set_ficha_verificada(uuid, boolean) to authenticated;
