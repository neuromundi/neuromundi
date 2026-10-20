-- ============================================================================
-- 0311 — Las 746 fichas del plan que no tenian token de invitacion
--
-- El plan de tandas tenia 1,122 fichas y la tabla de invitaciones solo 390
-- tokens. La cola de envio cruza las dos tablas con un join cerrado, asi que
-- una ficha del plan sin token es INVISIBLE para el envio: no sale, no falla y
-- el ensayo en seco solo reporta menos correos. Las tandas 7 a 19 y 25 a 30 no
-- tenian ni un token: 692 fichas que nunca habrian recibido su invitacion.
--
-- Esto NO envia ningun correo. Crear el token solo deja la fila lista; el envio
-- es una llamada aparte con {"send": true}. `expira_en` toma el valor por
-- omision y da igual: la vigencia se vuelve a sellar al enviar
-- (`sellar_plazo_invitacion`), asi que una fila sin enviar no caduca.
--
-- Se crean solo para fichas que la propia cola aceptaria. Medido antes de
-- insertar: las 746 cumplen las cinco condiciones. Medido despues: 1,136 tokens,
-- cero fichas del plan sin token, y la cola de las tandas que estaban vacias ya
-- devuelve filas (7->41, 12->49, 19->48, 30->29).
--
-- Idempotente: `where not exists` y el indice unico de "una invitacion viva por
-- ficha" impiden duplicados si se vuelve a ejecutar.
-- ============================================================================

insert into public.directorio_invitaciones (directorio_id, correo)
select p.ficha_id, btrim(d.correo)
from public.directorio_plan_invitacion p
join public.directorio d on d.id = p.ficha_id
where not exists (
        select 1 from public.directorio_invitaciones i
        where i.directorio_id = p.ficha_id
      )
  and d.estado_revision = 'publicado'
  and not d.baja_solicitada
  and d.reclamada_por is null
  and not coalesce(d.correo_rebotado, false)
  and d.correo ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'
  and d.correo !~* '@preview\.neuromundi\.com$';
