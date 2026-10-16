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

/**
 * Devuelve la categoría de un tipo de notificación.
 *
 * Espejo EXACTO de public.notif_category (migración 0244). Los tipos creados
 * por las migraciones recientes caían todos en 'otras', y la categoría es lo
 * que el usuario silencia: un aviso de que su ficha está a punto de retirarse
 * por falta de cuota no puede estar en el mismo cajón que lo accesorio.
 */
export function notifCategory(type: string): NotifCategory {
  if (type.startsWith('appt_') || type === 'booking_request' || type === 'waitlist_slot'
    || type === 'reservas_en_rafaga') return 'citas';
  if (type.startsWith('contacto_') || type === 'direct_message' || type === 'admin_message'
    || type === 'account_costo' || type === 'pregunta_experto') return 'mensajes';
  if (
    type.startsWith('evento_') ||
    type === 'post_achievement' ||
    type === 'badge' ||
    type === 'waitlist_join' ||
    type === 'referral_use' ||
    type === 'referral_reward' ||
    type === 'directory_match' ||
    type === 'suspension_reminder' ||
    type === 'topic_job' ||
    type === 'topic_venue' ||
    type === 'forum_new' ||
    type === 'forum_pending' ||
    type === 'forum_approved' ||
    type === 'forum_mod_call' ||
    type === 'forum_mod_approved' ||
    type === 'donor_wall' ||
    type === 'founder_wall' ||
    type === 'muro_de_fundadores' ||
    type === 'invite_opened'
  )
    return 'comunidad';
  // Dinero y permanencia en el directorio.
  if (
    type === 'commission_paid' ||
    type === 'donation_thanks' ||
    type === 'membership_paid' ||
    type === 'pago_terapia' ||
    // Prefijo, no lista: la 0246 partió los avisos de exención en cuatro tipos
    // más (aprobada, aprobada_hasta, rechazada, rechazada_motivo) y con la
    // lista cerrada caían en 'otras' aquí mientras la base los daba por
    // transacciones. Medido el 16 oct 2026.
    type.startsWith('exencion_') ||
    type === 'founder_request' ||
    type === 'founder_request_approved' ||
    type === 'fundador_resolicita' ||
    type === 'empresa_limitada' ||
    type === 'empresa_reactivada' ||
    type === 'empresa_sin_directorio' ||
    type === 'directory_grace' ||
    type === 'stock_agotado'
  )
    return 'transacciones';
  if (type === 'campaign') return 'campanas';
  return 'otras';
}

/**
 * A dónde lleva un aviso al pulsarlo.
 *
 * Antes no llevaba a ninguna parte: pulsar "nueva solicitud de reserva" o "su
 * perfil ya está publicado" sólo las marcaba leídas. (Auditoría 15 oct 2026,
 * hallazgo M-7.) `null` = no hay destino sensato y el aviso sólo se marca.
 */
export function notifDestino(type: string, data?: unknown): string | null {
  const d = (data ?? {}) as { post_id?: string; folio?: string; id?: string };
  if (type.startsWith('appt_')) return '/calendario';
  if (type === 'booking_request' || type === 'waitlist_slot' || type === 'waitlist_join') return '/panel';
  if (type === 'direct_message' || type === 'admin_message') return '/mensajes';
  if (type === 'post_achievement') return d.post_id ? `/contenido/${d.post_id}` : '/blog';
  if (type === 'badge' || type === 'muro_de_fundadores' || type === 'founder_wall') return '/fundadores';
  if (type === 'donor_wall' || type === 'donation_thanks') return '/donantes';
  if (type === 'referral_use' || type === 'referral_reward' || type === 'commission_paid') return '/panel';
  if (type === 'membership_paid' || type === 'pago_terapia') return '/panel';
  if (type === 'exencion_solicitada' || type === 'exencion_resuelta' || type === 'exencion_por_vencer') return '/panel';
  if (type === 'founder_request' || type === 'founder_request_approved' || type === 'fundador_resolicita') return '/panel';
  if (type === 'empresa_limitada' || type === 'empresa_reactivada' || type === 'empresa_sin_directorio') return '/panel';
  if (type === 'directory_grace' || type === 'suspension_reminder' || type === 'account_costo') return '/panel';
  if (type === 'stock_agotado') return '/panel';
  if (type === 'pregunta_experto' || type === 'reservas_en_rafaga' || type === 'invitaciones_renovadas') return '/panel';
  if (type.startsWith('contacto_')) return '/panel';
  // El evento aprobado ya está en la página pública; lo demás se atiende desde
  // el panel (el prestador en su pestaña de eventos, usted en su bandeja).
  if (type === 'evento_aprobado') return '/eventos';
  if (type.startsWith('evento_')) return '/panel';
  if (type === 'directory_match') return '/directorio';
  if (type === 'topic_job') return '/inclusion-laboral';
  if (type === 'topic_venue') return '/directorio';
  if (type.startsWith('forum_')) return '/tribu';
  if (type === 'invite_opened') return '/panel';
  if (type === 'campaign') return '/beneficios';
  return null;
}

/** ¿El push de este tipo llegaría con estas preferencias? (para pruebas/preview) */
export function pushAllowed(
  type: string,
  prefs: { push_enabled: boolean; muted_categories: string[] },
): boolean {
  if (!prefs.push_enabled) return false;
  return !prefs.muted_categories.includes(notifCategory(type));
}
