/**
 * Los avisos se traducen POR TIPO. Cuando dos mensajes distintos comparten
 * tipo, no se puede traducir ninguno: eso le pasaba al aviso de membresia
 * pagada, que usaba el mismo para el miembro y para administracion.
 */
import { describe, it, expect } from 'vitest';
import { notifCategory, notifDestino } from './notificationPrefs';

describe('avisos de membresia pagada', () => {
  it('el del miembro y los de administracion son tipos distintos', () => {
    const tipos = ['membership_paid', 'membership_paid_admin_anual', 'membership_paid_admin_mensual'];
    expect(new Set(tipos).size).toBe(3);
  });

  it('los tres caen en la categoria de transacciones', () => {
    for (const t of ['membership_paid', 'membership_paid_admin_anual', 'membership_paid_admin_mensual']) {
      expect(notifCategory(t)).toBe('transacciones');
    }
  });

  it('los tres llevan al panel al tocarlos', () => {
    for (const t of ['membership_paid', 'membership_paid_admin_anual', 'membership_paid_admin_mensual']) {
      expect(notifDestino(t, {})).toBe('/panel');
    }
  });
});
