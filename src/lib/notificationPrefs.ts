/**
 * notificationPrefs — categorías de notificación (lógica pura, testeable).
 *
 * El usuario no elige tipo por tipo (son demasiados y cambian); elige por
 * CATEGORÍA. Este mapa debe coincidir EXACTO con la función `notif_category`
 * de la migración 0049: si cambias uno, cambia el otro, o el push y la UI
 * discreparán.
 */

export type NotifCategory = 'citas' | 'mensajes' | 'comunidad' | 'transacciones' | 'campanas' | 'otras';

/** Orden en que se muestran en Ajustes. */
export const NOTIF_CATEGORIES: NotifCategory[] = [
  'citas',
  'mensajes',
  'comunidad',
  'transacciones',
  'campanas',
  'otras',
];

/** Devuelve la categoría de un tipo de notificación. */
export function notifCategory(type: string): NotifCategory {
  if (type.startsWith('appt_') || type === 'booking_request' || type === 'waitlist_slot') return 'citas';
  if (type === 'direct_message' || type === 'admin_message' || type === 'account_costo') return 'mensajes';
  if (
    type === 'post_achievement' ||
    type === 'badge' ||
    type === 'waitlist_join' ||
    type === 'referral_use' ||
    type === 'referral_reward' ||
    type === 'directory_match' ||
    type === 'suspension_reminder'
  )
    return 'comunidad';
  if (type === 'commission_paid' || type === 'donation_thanks') return 'transacciones';
  if (type === 'campaign') return 'campanas';
  return 'otras';
}

/** ¿El push de este tipo llegaría con estas preferencias? (para pruebas/preview) */
export function pushAllowed(
  type: string,
  prefs: { push_enabled: boolean; muted_categories: string[] },
): boolean {
  if (!prefs.push_enabled) return false;
  return !prefs.muted_categories.includes(notifCategory(type));
}
