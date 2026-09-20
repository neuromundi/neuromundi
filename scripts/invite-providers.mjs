#!/usr/bin/env node
/**
 * invite-providers.mjs — RETIRADO (2026-09-19). NO USAR.
 *
 * Este script pertenecía al MODELO VIEJO ya descartado: generaba enlaces de
 * recuperación (primera contraseña) para cuentas sembradas
 * (membership_status='exempt', role='provider') vía la Admin API. Ese modelo
 * se retiró en las migraciones 0092 y 0095 (los correos inventados y las
 * cuentas rotas se convirtieron en FICHAS del directorio). Además, este script
 * NO respeta enviada_en / cancelada_en / correo_rebotado ni el `sector`, así que
 * volver a usarlo reproduciría el incidente del 2026-09-08 (ofertas de pago a
 * organismos públicos, escritura a buzones muertos).
 *
 * FLUJO CORRECTO AHORA
 *   La invitación "reclama tu ficha y únete a Neuromundi" se envía con la Edge
 *   Function `enviar-invitaciones`, que toma la cola blindada
 *   `directorio_invitaciones_cola`, arranca en DRY-RUN, exige el header
 *   x-cron-secret y solo envía con {"send": true}. Ver
 *   supabase/functions/enviar-invitaciones/index.ts.
 *
 * Se deja este archivo como lápida para que nadie reintroduzca el modelo viejo.
 */
console.error(
  '\n[invite-providers] RETIRADO. No uses este script.\n' +
  'Envía las invitaciones con la Edge Function `enviar-invitaciones`\n' +
  '(cola directorio_invitaciones_cola, dry-run por defecto, candado x-cron-secret).\n'
);
process.exit(1);
