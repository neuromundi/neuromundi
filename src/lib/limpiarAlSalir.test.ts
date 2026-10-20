/**
 * Al cerrar sesion, lo guardado en el dispositivo se quedaba. Ahi vivia la
 * credencial Neuromundi ID en cache, con el qr_token que un prestador escanea:
 * en un dispositivo compartido, la siguiente persona abria /mi-id y veia la
 * credencial de la anterior. Estas pruebas fijan que se borre lo de la persona
 * y NO lo del dispositivo.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { limpiarAlSalir } from './limpiarAlSalir';

describe('limpiarAlSalir', () => {
  beforeEach(() => localStorage.clear());

  it('borra la credencial en cache, que es lo mas delicado', () => {
    localStorage.setItem('neuro.id.card', JSON.stringify({ member_no: 18, qr_token: 'secreto' }));
    limpiarAlSalir();
    expect(localStorage.getItem('neuro.id.card')).toBeNull();
  });

  it('borra la foto a medio subir y las sucursales sin guardar', () => {
    localStorage.setItem('nm_foto_pendiente', 'data:image/png;base64,AAA');
    localStorage.setItem('nm_sucursales_pendientes', '[{"ciudad":"Saltillo"}]');
    localStorage.setItem('neuromundi.pendingWelcome', '1');
    limpiarAlSalir();
    expect(localStorage.getItem('nm_foto_pendiente')).toBeNull();
    expect(localStorage.getItem('nm_sucursales_pendientes')).toBeNull();
    expect(localStorage.getItem('neuromundi.pendingWelcome')).toBeNull();
  });

  it('borra los avisos fechados por usuario, cualquiera que sea el identificador', () => {
    localStorage.setItem('nm_renewal_notice_abc-123', '1760000000000');
    localStorage.setItem('nm_renewal_notice_otro-456', '1760000000000');
    limpiarAlSalir();
    expect(localStorage.getItem('nm_renewal_notice_abc-123')).toBeNull();
    expect(localStorage.getItem('nm_renewal_notice_otro-456')).toBeNull();
  });

  it('NO borra lo que es del dispositivo: idioma y accesibilidad se quedan', () => {
    localStorage.setItem('i18nextLng', 'pt');
    localStorage.setItem('neuromundi.toolkitProgress', '["a","b"]');
    limpiarAlSalir();
    expect(localStorage.getItem('i18nextLng')).toBe('pt');
    expect(localStorage.getItem('neuromundi.toolkitProgress')).toBe('["a","b"]');
  });

  it('no revienta si el navegador no deja guardar nada', () => {
    const original = Storage.prototype.removeItem;
    Storage.prototype.removeItem = () => { throw new Error('bloqueado'); };
    expect(() => limpiarAlSalir()).not.toThrow();
    Storage.prototype.removeItem = original;
  });
});
