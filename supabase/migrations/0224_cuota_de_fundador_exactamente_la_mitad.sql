-- 0224 — La cuota de fundador pasa a ser EXACTAMENTE la mitad de la ordinaria.
--
-- EL PROBLEMA. Los precios se capturaron como cifras redondas en cada moneda,
-- por separado para fundador y para ordinaria. En Mexico y Chile la division
-- salio exacta; en los otros 22 paises el descuento real quedo entre el 44% y
-- el 56% segun pais y tipo de perfil. El correo de invitacion y la pantalla de
-- precios prometen "50%", de modo que para 103 de los 216 pares la promesa era
-- falsa, unas veces a favor del cliente y otras en contra.
--
-- Un descuento que varia del 44% al 56% sin ninguna razon visible no se puede
-- defender si dos personas comparan. No es politica de precios: es un
-- redondeo que nadie reviso.
--
-- QUE SE AJUSTA Y QUE NO. Se mueve la cuota de FUNDADOR, no la ordinaria. La
-- ordinaria es el precio de referencia, el que aparece tachado y el que paga
-- quien llega tarde; moverlo cambiaria el ancla de toda la comunicacion. La de
-- fundador es promocional y HOY NO LA PAGA NADIE (cero membresias activas
-- medidas el 14 oct 2026), asi que puede corregirse sin afectar a un solo
-- cliente. Dentro de tres meses ya no.
--
-- MEXICO NO SE MUEVE. Sus 294 fichas del plan de invitaciones son mexicanas y
-- Mexico ya estaba exacto: ni un peso de lo que se va a enviar cambia.
--
-- ALCANCE MEDIDO: 216 pares, 113 ya exactos, 103 se ajustan.
--   57 suben  · promedio +4.66% · maximo +12.50% (Cuba y Portugal, de 200 a 225)
--   46 bajan  · promedio -4.55% · maximo -10.00% (Panama, Puerto Rico, Venezuela,
--                                                 de 250 a 225)
--
-- Se mueven TRES columnas a la vez para no romper la aritmetica de la oferta
-- permanente de "pagas 10 meses y recibes 12":
--   annual_amount      = ordinaria / 2
--   amount             = igual que annual_amount (hoy coinciden en las 216)
--   annual_list_amount = annual_amount * 1.2   (12 meses sobre 10 pagados)
--
-- Verificado antes de escribir esto: ninguno de los 103 valores nuevos queda
-- con decimales, ni en annual_amount ni en annual_list_amount, incluidas las
-- monedas sin centavos (CLP y PYG).
update membership_prices f
   set annual_amount      = o.annual_amount / 2,
       amount             = o.annual_amount / 2,
       annual_list_amount = (o.annual_amount / 2) * 1.2
  from membership_prices o
 where f.member_class = 'founder'
   and o.member_class = 'ordinary'
   and o.country_label = f.country_label
   and o.affiliate_type = f.affiliate_type
   and f.is_active and o.is_active
   and coalesce(o.annual_amount, 0) > 0
   and coalesce(f.annual_amount, 0) > 0
   and f.annual_amount <> o.annual_amount / 2;
