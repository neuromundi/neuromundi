import { describe, expect, it } from 'vitest';
import { leerCoordenadas, coordenadasValidas } from './coordenadas';

describe('leerCoordenadas', () => {
  it('lee el par que entrega el clic derecho de Google Maps', () => {
    expect(leerCoordenadas('19.4326, -99.1332')).toEqual({ lat: 19.4326, lng: -99.1332 });
    expect(leerCoordenadas('19.4326,-99.1332')).toEqual({ lat: 19.4326, lng: -99.1332 });
    expect(leerCoordenadas('  19.4326   -99.1332 ')).toEqual({ lat: 19.4326, lng: -99.1332 });
  });

  it('lee el enlace con el centro del mapa', () => {
    expect(leerCoordenadas('https://www.google.com/maps/@19.4326,-99.1332,17z'))
      .toEqual({ lat: 19.4326, lng: -99.1332 });
  });

  it('prefiere el punto exacto (!3d!4d) sobre el centro del mapa', () => {
    const url = 'https://www.google.com/maps/place/X/@19.1,-99.1,17z/data=!3d19.4326!4d-99.1332';
    expect(leerCoordenadas(url)).toEqual({ lat: 19.4326, lng: -99.1332 });
  });

  it('lee ?q=lat,lng', () => {
    expect(leerCoordenadas('https://maps.google.com/?q=-33.4489,-70.6693'))
      .toEqual({ lat: -33.4489, lng: -70.6693 });
  });

  it('no adivina cuando no hay coordenadas reconocibles', () => {
    expect(leerCoordenadas('')).toBeNull();
    expect(leerCoordenadas('Av. Reforma 222, CDMX')).toBeNull();
    expect(leerCoordenadas('19.4326')).toBeNull();
    // Fuera de rango: no es una coordenada.
    expect(leerCoordenadas('100.5, -99.1')).toBeNull();
    // 0,0 es el Golfo de Guinea: casi siempre significa "no se capturó".
    expect(leerCoordenadas('0, 0')).toBeNull();
  });
});

describe('coordenadasValidas', () => {
  it('acepta los extremos reales', () => {
    expect(coordenadasValidas(-90, 180)).toBe(true);
    expect(coordenadasValidas(90, -180)).toBe(true);
  });
  it('rechaza lo que se sale', () => {
    expect(coordenadasValidas(91, 0)).toBe(false);
    expect(coordenadasValidas(0, 181)).toBe(false);
    expect(coordenadasValidas(NaN, 0)).toBe(false);
  });
});
