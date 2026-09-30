-- ============================================================================
-- 0142 · Columna `carril` en el plan de invitación
--
-- QUÉ ESTABA MAL EN EL PRIMER PLAN
--   El score daba +3 a `social`, +2 a `publico` y +0 a `privado`, así que el
--   top 100 salió 75 social / 16 publico / 9 privado. Existen 74 clínicas
--   privadas con dominio propio y teléfono y quedaron fuera casi todas.
--
--   Dos problemas, no uno:
--   1. Apostaba todo a una hipótesis SIN evidencia. Nadie ha recibido aún una
--      invitación. Si el supuesto «los exentos aceptan más» es falso, las
--      cuatro tandas fallan juntas y no se aprende nada.
--   2. Dejaba fuera a quienes sí pagarían. Un directorio lleno de A.C. exentas
--      no sostiene la plataforma.
--
--   La corrección: cada tanda lleva dos carriles y se miden por separado.
--
-- Idempotente.
-- ============================================================================

alter table public.directorio_plan_invitacion
  add column if not exists carril text;

comment on column public.directorio_plan_invitacion.carril is
  'A = alta probabilidad (social/publico, exentos de cuota). '
  'B = alto valor (privado con dominio propio, son los que pagarian). '
  'Se comparan por separado: son hipotesis distintas.';
