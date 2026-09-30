-- ============================================================================
-- 0149 · Ampliar el cupo de Miembros Fundadores (decisión D1 de Enyoria)
--
-- POR QUÉ
--   Al retirar la escalera de descuento (`campaign_config.founder_discount`
--   quedó vacía), el beneficio de fundador vive únicamente en el renglón de
--   `membership_prices`. Eso corrigió el doble descuento, pero dejó expuesto el
--   problema inverso: `create-membership-checkout` elige el precio base según
--   `is_founder()`, así que **quien no alcance asiento paga la tarifa ordinaria,
--   que es el doble de la que promete el correo de invitación**.
--
--   Los 100 invitados de la campaña se reparten así (medido):
--     · 92 caen en 'professionals'  (clínica, escuela, legal, cuidados,
--                                    bienestar, especialista)
--     ·  8 caen en 'providers'      (sólo comercio)
--   `founderKindFor()` en src/hooks/useFounder.ts manda `merchant` a
--   'providers' y todo lo demás a 'professionals'.
--
--   Con el tope anterior de 100 y 1 asiento ya usado en cada cupo, 92 personas
--   competían por 99 lugares — y los lugares se consumen con sólo entrar a la
--   plataforma, sin pagar. El cupo se agotaba sin un peso cobrado y las más de
--   900 fichas restantes se quedaban sin nada que ofrecer.
--
-- QUÉ HACE
--   professionals: 100 → 300
--   providers:     100 → 150
--   families y companies quedan igual (500 y 20).
--
--   300 sobre 1,026 fichas es menos de un tercio, así que el distintivo
--   conserva significado, y ninguna de las cuatro tandas puede agotar el cupo
--   ni en el mejor escenario.
--
-- PENDIENTE, NO LO RESUELVE ESTA MIGRACIÓN
--   1. El valor sigue duplicado en TypeScript (`FOUNDER_CAPACITY` en
--      src/hooks/useFounder.ts). Este commit lo cambia también, pero mientras
--      vivan en dos lugares pueden divergir. Sacarlo a configuración y darle
--      control en el panel es lo que Enyoria pidió; queda como tarea aparte.
--   2. El asiento se consume al ENTRAR, no al pagar (useFounderAutoClaim +
--      claim_founder_slot, con grace_until = now() + 3 meses). Ampliar el cupo
--      reduce el daño pero no arregla la causa.
--
-- Idempotente. NO envía nada.
-- ============================================================================

create or replace function public.founder_capacity(p_kind text)
returns integer language sql immutable as $$
  select case p_kind
    when 'families'      then 500
    when 'companies'     then 20
    when 'providers'     then 150
    when 'professionals' then 300
    else 100
  end;
$$;
