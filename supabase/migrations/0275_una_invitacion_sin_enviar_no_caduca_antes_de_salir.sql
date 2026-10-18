-- 0275: una invitacion que todavia no ha salido no puede "caducar" antes de salir.
--
-- Medido el 18 de octubre de 2026.
--
-- La vigencia del enlace (`expira_en`) nace con la fila, por omision a 60 dias
-- de la fecha de CREACION. Al enviar el correo, `directorio_invitacion_enviada`
-- la vuelve a calcular desde ese momento, asi que el destinatario SIEMPRE
-- recibe sus 60 dias completos. Eso esta bien y no se toca.
--
-- El problema esta en la cola de envio: las dos funciones que arman la lista de
-- a quien se le manda filtran `i.expira_en > now()`. Como la cola solo mira
-- filas con `enviada_en is null` — es decir, filas que por definicion todavia no
-- han salido — ese filtro nunca protege de nada y en cambio puede DESCARTAR en
-- silencio a una ficha cuya fila se creo hace mucho. No da error, no aparece en
-- ningun reporte: simplemente esa persona nunca recibe su invitacion.
--
-- Exposicion real medida hoy: ninguna ficha se esta perdiendo todavia (tanda 5,
-- 38 de 38; tanda 6, 34 de 34), pero las filas de esas dos tandas se crearon en
-- septiembre y vencen el 7 de noviembre. Son 72 fichas que desaparecerian de la
-- cola sin avisar si su envio se recorre tres semanas — y el calendario
-- aprobado arranca con una rampa de calentamiento, o sea que recorrerse es
-- justo lo que puede pasar.
--
-- El resto de los filtros (cancelada, baja, ya usada, ficha publicada, no
-- reclamada, correo no rebotado, deduplicado por correo) siguen intactos: son
-- los que de verdad deciden si alguien debe recibir el correo.
--
-- Comprobacion posterior, llamando a la cola: tanda 1 = 25, tanda 5 = 37,
-- tanda 6 = 34, tanda 20 = 32. Quitar una restriccion solo puede sumar filas,
-- nunca restarlas, y hoy no habia ninguna vencida, asi que los numeros son los
-- mismos de antes.

do $mig$
declare
  v_def text;
  v_veces int;
  v_fn text;
begin
  foreach v_fn in array array['directorio_invitaciones_cola_tanda_v2',
                              'directorio_invitaciones_cola_v2'] loop
    select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = v_fn;

    if v_def is null then
      raise exception 'No existe la funcion %. No se toco nada.', v_fn;
    end if;

    v_veces := (length(v_def) - length(replace(v_def, 'and i.expira_en > now()', '')))
               / length('and i.expira_en > now()');

    if v_veces = 0 then
      raise notice 'La funcion % ya no filtra por vigencia; se deja como esta.', v_fn;
      continue;
    end if;

    if v_veces <> 1 then
      raise exception 'En % se esperaba el filtro de vigencia exactamente una vez y aparece % veces. No se toco nada.', v_fn, v_veces;
    end if;

    v_def := replace(
      v_def,
      'and i.expira_en > now()',
      '/* la vigencia se recalcula al enviar: una fila sin enviar no caduca */ and true'
    );

    execute v_def;
  end loop;
end
$mig$;
