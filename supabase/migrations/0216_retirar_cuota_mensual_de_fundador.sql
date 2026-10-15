-- 0216 — Retira la cuota mensual de la clase fundador.
--
-- POR QUE. El descuento de Miembro Fundador rige SOLO en la suscripcion anual,
-- por decision del dueno (14 oct 2026). create-membership-checkout cobra clase
-- 'ordinary' en cuanto el periodo es mensual, de modo que el monthly_amount de
-- los renglones de fundador NO SE PUEDE COBRAR NUNCA.
--
-- Mientras siguiera ahi, era un precio fantasma: la mitad del precio real,
-- visible para cualquiera que lea la tabla o el panel de tarifas, y ya
-- confundio una vez (se leyo "la mensual de wellness Mexico es 250" cuando el
-- cargo real es 500). Un dato que no se puede cobrar no debe estar capturado.
--
-- El renglon de fundador se conserva entero: annual_amount y
-- annual_list_amount siguen siendo los que se cobran y los que se muestran.
-- Solo se vacia la columna mensual.
update membership_prices
   set monthly_amount = null
 where member_class = 'founder'
   and monthly_amount is not null;
