-- 0213 — Corrige membership_prices.zero_decimal.
--
-- LA FALLA: la columna venia con true en las DIECISEIS monedas configuradas.
-- create-membership-checkout la usaba para decidir si multiplicar por 100
-- antes de mandarle el importe a Stripe, asi que mandaba el importe en pesos
-- donde Stripe espera centavos: una cuota de MXN 500.00 se cobraba como
-- MXN 5.00. Cien veces menos, en todos los paises menos Chile y Paraguay.
--
-- De las monedas configuradas, solo CLP y PYG son realmente sin decimales
-- segun Stripe. Las otras catorce (BOB, BRL, CAD, COP, CRC, DOP, EUR, GTQ,
-- HNL, MXN, NIO, PEN, USD, UYU) se cobran en centavos.
--
-- El codigo del checkout ya NO confia en esta columna: lleva su propia lista
-- de monedas sin decimales y ademas rechaza cualquier cuota que acabe por
-- debajo de 100 unidades minimas. Esta migracion corrige el dato de todas
-- formas, para que no vuelva a enganar a nadie que lo lea.
update membership_prices
   set zero_decimal = (lower(currency) in ('clp','pyg'))
 where zero_decimal is distinct from (lower(currency) in ('clp','pyg'));
