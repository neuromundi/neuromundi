-- ===========================================================================
-- 0207 · Dar de alta un correo conseguido por telefono y meter la ficha a tanda.
--
-- Pedido de Enyoria (14 oct 2026). De las 415 fichas publicadas sin correo, 287
-- tienen telefono. Conforme consiga correos llamando, necesita capturarlos y
-- que esa ficha entre a la cola de envio sin tocar la base a mano.
--
-- Para que una ficha salga en la cola hacen falta CUATRO cosas a la vez, y esta
-- funcion las deja todas listas en una sola operacion:
--   1. directorio.correo con formato valido y sin rebote marcado
--   2. una invitacion viva (token, no enviada, no usada, no vencida)
--   3. un renglon en directorio_plan_invitacion con tanda y orden
--   4. la ficha publicada, sin baja y sin reclamar
--
-- La invitacion vence 14 dias DESPUES del plazo de verificacion, para que nunca
-- muera antes de la fecha que el propio correo le promete al destinatario.
-- Carril 'T' (telefono), tanda 9 por omision, para poder enviarlas aparte.
--
-- NOTA: se aplico en dos migraciones (0207 y 0207b) porque el canal MCP agota
-- su tiempo con payloads largos. Este archivo mas 0207b son el equivalente.
-- ===========================================================================

create or replace function public.admin_alta_correo_ficha(
  p_ficha uuid,
  p_correo text,
  p_tanda smallint default 9,
  p_nota text default null
) returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_correo text := lower(btrim(coalesce(p_correo, '')));
  v_tanda  smallint := coalesce(p_tanda, 9);
  v_d      record;
  v_token  text;
  v_orden  int;
  v_expira timestamptz;
begin
  if not public.is_admin() then
    raise exception 'solo_admin' using errcode = 'insufficient_privilege';
  end if;

  if v_correo !~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then
    raise exception 'correo_invalido'
      using errcode = 'check_violation', hint = 'Revise el correo: falta la arroba o el dominio.';
  end if;
  if v_correo ~* '@preview\.neuromundi\.com$' then
    raise exception 'correo_invalido'
      using errcode = 'check_violation', hint = 'Ese dominio es de relleno, no sirve para enviar.';
  end if;

  select id, nombre, estado_revision, baja_solicitada, reclamada_por, correo_rebotado
    into v_d
  from public.directorio where id = p_ficha;

  if not found then raise exception 'ficha_no_encontrada'; end if;
  if v_d.baja_solicitada then
    raise exception 'ficha_dada_de_baja'
      using errcode = 'check_violation', hint = 'Esta ficha pidio salir del directorio; no se le vuelve a escribir.';
  end if;
  if v_d.reclamada_por is not null then
    raise exception 'ficha_ya_reclamada'
      using errcode = 'check_violation', hint = 'Esta ficha ya tiene dueno: no necesita invitacion.';
  end if;

  -- 1 · el correo en la ficha, y se levanta la marca de rebote si la tenia
  update public.directorio
     set correo = v_correo,
         correo_rebotado = false,
         correo_rebotado_el = null,
         actualizada_en = now()
   where id = p_ficha;

  -- 2 · invitacion viva: se reutiliza la que haya, si no se crea
  v_expira := coalesce(public.verificacion_deadline(), now() + interval '60 days') + interval '14 days';

  select token into v_token
  from public.directorio_invitaciones
  where directorio_id = p_ficha
    and enviada_en is null and usada_en is null
    and baja_en is null and cancelada_en is null
  order by creada_en desc limit 1;

  if v_token is null then
    insert into public.directorio_invitaciones (directorio_id, correo, expira_en)
    values (p_ficha, v_correo, v_expira)
    returning token into v_token;
  else
    update public.directorio_invitaciones
       set correo = v_correo,
           expira_en = greatest(expira_en, v_expira)
     where token = v_token;
  end if;

  -- 3 · renglon del plan, al final de su tanda
  select coalesce(max(orden), 0) + 1 into v_orden
  from public.directorio_plan_invitacion where tanda = v_tanda;

  insert into public.directorio_plan_invitacion (ficha_id, tanda, orden, score, motivo, carril)
  values (p_ficha, v_tanda, v_orden, 0,
          coalesce(nullif(btrim(coalesce(p_nota, '')), ''), 'correo conseguido por telefono'), 'T')
  on conflict (ficha_id) do update
     set tanda = excluded.tanda, orden = excluded.orden,
         motivo = excluded.motivo, carril = excluded.carril;

  return json_build_object(
    'ok', true, 'ficha', p_ficha, 'nombre', v_d.nombre,
    'correo', v_correo, 'tanda', v_tanda, 'orden', v_orden,
    'token', v_token, 'expira_en', v_expira
  );
end
$$;

comment on function public.admin_alta_correo_ficha(uuid, text, smallint, text) is
  'Captura un correo conseguido por telefono, crea o reutiliza la invitacion y mete la ficha en una tanda. Solo admin.';

revoke all on function public.admin_alta_correo_ficha(uuid, text, smallint, text) from public, anon;
grant execute on function public.admin_alta_correo_ficha(uuid, text, smallint, text) to authenticated, service_role;
