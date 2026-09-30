-- ============================================================================
-- 0157 · La bitácora de cuentas admite las acciones del administrador
--
-- `account_actions.action` tenía un CHECK con cuatro valores: cancel, suspend,
-- reactivate, winback_costo. Eran las acciones que el propio usuario podía
-- hacer sobre su cuenta.
--
-- La tabla de miembros (0155) añade tres que sólo hace el admin: exentar de
-- cuota, quitar la exención y prorrogar la vigencia. Sin ampliar el CHECK, esas
-- acciones fallan al registrarse en la bitácora y tumban la operación entera.
--
-- Se amplía el vocabulario en vez de dejar de registrar: una prórroga o una
-- exención mueven dinero y tienen que quedar asentadas, con quién y por qué
-- (`reason = 'admin'`, `reason_detail` = la nota que escriba el administrador).
--
-- Idempotente. NO envía nada.
-- ============================================================================

alter table public.account_actions drop constraint if exists account_actions_action_check;

alter table public.account_actions add constraint account_actions_action_check
  check (action = any (array[
    -- Las que hace el propio usuario sobre su cuenta.
    'cancel', 'suspend', 'reactivate', 'winback_costo',
    -- Las que hace el administrador desde la tabla de miembros (0155).
    'exempt', 'unexempt', 'extend'
  ]));
