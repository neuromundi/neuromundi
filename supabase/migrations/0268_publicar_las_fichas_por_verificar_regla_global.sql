-- 0268: publicar las fichas que estaban en 'por_verificar'.
--
-- Por que: el correo de invitacion afirma en tres lugares que la ficha del
-- destinatario YA figura en el directorio publico. Medido antes de esto, 604
-- de las 1,122 fichas del plan (53.8%) no estaban publicadas, asi que mas de la
-- mitad de los correos habria dicho algo falso, y el fundamento del pie legal
-- se habria caido con ellas.
--
-- Regla global, decidida por Enyoria el 17 de octubre: se publican en todas las
-- ubicaciones, en el mismo estado que ya tenian las 729 mexicanas. Comprobado
-- que esas 729 tampoco estan verificadas a mano: son del mismo tipo.
--
-- No se tocan las que pidieron baja (hoy ninguna en este estado).
-- Si se incluyen las 8 de dominio de correo inexistente: la organizacion existe
-- y la ficha es valida aunque no se le pueda escribir.

update public.directorio
   set estado_revision = 'publicado',
       actualizada_en = now()
 where estado_revision = 'por_verificar'
   and not baja_solicitada;
