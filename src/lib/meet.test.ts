import { describe, it, expect } from 'vitest';
import { jitsiRoomUrl, isMeetUrl } from './meet';

/** Nombre de la sala = lo que va después del último '/'. */
function room(url: string): string {
  return url.slice(url.lastIndexOf('/') + 1);
}

describe('jitsiRoomUrl', () => {
  it('genera una URL de meet.jit.si con prefijo Neuromundi', () => {
    const u = jitsiRoomUrl();
    expect(u.startsWith('https://meet.jit.si/Neuromundi-')).toBe(true);
  });

  it('incorpora la semilla saneada (sin caracteres raros)', () => {
    const u = jitsiRoomUrl('Cita: Ana & Dr. Pérez!!');
    // "Cita: Ana & Dr. Pérez!!" pierde acentos y signos -> "CitaAnaDrPrez"
    expect(u).toContain('Neuromundi-CitaAnaDrPrez-');
    // Se valida la SALA, no la URL completa: el ':' de "https://" no cuenta.
    expect(room(u)).toMatch(/^[A-Za-z0-9-]+$/);
  });

  it('trunca semillas muy largas', () => {
    const u = jitsiRoomUrl('A'.repeat(80));
    expect(room(u).length).toBeLessThan(80);
  });

  it('dos llamadas dan salas distintas (únicas)', () => {
    expect(jitsiRoomUrl('x')).not.toBe(jitsiRoomUrl('x'));
  });
});

describe('isMeetUrl', () => {
  it('reconoce salas Jitsi', () => {
    expect(isMeetUrl('https://meet.jit.si/Neuromundi-abc')).toBe(true);
    expect(isMeetUrl('https://meet.jit.si/')).toBe(true);
  });

  it('acepta la URL que produce jitsiRoomUrl', () => {
    expect(isMeetUrl(jitsiRoomUrl('consulta'))).toBe(true);
  });

  it('rechaza otras URLs o vacíos', () => {
    expect(isMeetUrl('https://zoom.us/j/123')).toBe(false);
    expect(isMeetUrl('https://meet.google.com/abc-defg-hij')).toBe(false);
    expect(isMeetUrl(null)).toBe(false);
    expect(isMeetUrl('')).toBe(false);
    expect(isMeetUrl('no-es-una-url')).toBe(false);
  });

  it('no se deja engañar por dominios parecidos', () => {
    expect(isMeetUrl('https://meet.jit.si.malicioso.com/sala')).toBe(false);
    expect(isMeetUrl('https://falsomeet.jit.si.com/sala')).toBe(false);
  });
});
