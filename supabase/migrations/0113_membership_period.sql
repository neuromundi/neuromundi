-- 0113: periodicidad de la membresía (mensual/anual) para ocultar el costo a
-- los miembros ya cubiertos. El recuadro de costo en el registro/onboarding:
--   · mensual cubierto  → se oculta siempre
--   · anual cubierto    → se oculta salvo en los 30 días previos al vencimiento
--   · no cubierto / anónimo → se muestra
-- La escribe el webhook de Stripe: en el alta desde s.metadata.period, y en las
-- renovaciones (invoice.paid) inferida del intervalo de la línea de factura
-- (≤ 45 días = mensual), para que los miembros existentes se autocorrijan al
-- renovar. Nullable = periodicidad desconocida (legado; se trata como anual).
alter table public.profiles
  add column if not exists membership_period text
  check (membership_period in ('monthly','annual'));
