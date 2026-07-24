import { describe, it, expect } from 'vitest';
import { notifCategory, pushAllowed, NOTIF_CATEGORIES } from './notificationPrefs';

describe('notifCategory', () => {
  it('agrupa las citas', () => {
    expect(notifCategory('appt_accepted')).toBe('citas');
    expect(notifCategory('appt_reminder')).toBe('citas');
    expect(notifCategory('booking_request')).toBe('citas');
    expect(notifCategory('waitlist_slot')).toBe('citas');
  });

  it('agrupa los mensajes', () => {
    expect(notifCategory('direct_message')).toBe('mensajes');
    expect(notifCategory('admin_message')).toBe('mensajes');
  });

  it('agrupa comunidad, transacciones y campañas', () => {
    expect(notifCategory('badge')).toBe('comunidad');
    expect(notifCategory('post_achievement')).toBe('comunidad');
    expect(notifCategory('commission_paid')).toBe('transacciones');
    expect(notifCategory('donation_thanks')).toBe('transacciones');
    expect(notifCategory('campaign')).toBe('campanas');
  });

  it('lo desconocido cae en otras', () => {
    expect(notifCategory('algo_nuevo')).toBe('otras');
  });

  it('toda categoría devuelta está en la lista visible', () => {
    for (const t of ['appt_x', 'direct_message', 'badge', 'commission_paid', 'campaign', 'zzz']) {
      expect(NOTIF_CATEGORIES).toContain(notifCategory(t));
    }
  });
});

describe('pushAllowed', () => {
  it('bloquea todo si el push está apagado', () => {
    expect(pushAllowed('direct_message', { push_enabled: false, muted_categories: [] })).toBe(false);
  });

  it('bloquea solo la categoría silenciada', () => {
    const prefs = { push_enabled: true, muted_categories: ['campanas'] };
    expect(pushAllowed('campaign', prefs)).toBe(false);
    expect(pushAllowed('direct_message', prefs)).toBe(true);
  });

  it('permite todo por defecto', () => {
    expect(pushAllowed('appt_reminder', { push_enabled: true, muted_categories: [] })).toBe(true);
  });
});
