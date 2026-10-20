/**
 * Firma de los avisos de Resend.
 *
 * Existe porque el endpoint que recibe los avisos es PUBLICO: si no se
 * comprueba la firma, cualquiera puede inventar un aviso de "rebotado" para que
 * Neuromundi deje de escribirle a una ficha, o uno de "entregado" para que las
 * cifras del panel mientan. El caso de prueba con valores reales viene de la
 * documentacion de Svix, consultada el 20 de octubre de 2026.
 */
import { describe, it, expect } from 'vitest';
import { firmaEsValida, igualesEnTiempoConstante } from './firmaSvix';

// Ejemplo oficial de Svix.
const EJEMPLO = {
  secreto: 'whsec_plJ3nmyCDGBKInavdOK15jsl',
  cuerpo: '{"event_type":"ping","data":{"success":true}}',
  id: 'msg_loFOjxBNrRLzqYUf',
  timestamp: '1731705121',
  firmaBuena: 'v1,rAvfW3dJ/X/qxhsaXPOyyCGmRKsaKWcsNccKXlIktD0=',
};

const base = (extra: Record<string, unknown> = {}) => ({
  secreto: EJEMPLO.secreto,
  cuerpo: EJEMPLO.cuerpo,
  id: EJEMPLO.id,
  timestamp: EJEMPLO.timestamp,
  firmas: EJEMPLO.firmaBuena,
  // El ejemplo es de noviembre de 2025: se fija el reloj para que no caduque.
  ahoraSegundos: Number.parseInt(EJEMPLO.timestamp, 10),
  ...extra,
});

describe('firma de los avisos de correo', () => {
  it('acepta la firma correcta (caso oficial de Svix)', async () => {
    await expect(firmaEsValida(base())).resolves.toBe(true);
  });

  it('acepta cuando vienen varias firmas y una es buena', async () => {
    const firmas = `v1,otraFirmaQueNoSirve= ${EJEMPLO.firmaBuena}`;
    await expect(firmaEsValida(base({ firmas }))).resolves.toBe(true);
  });

  it('rechaza si el cuerpo cambio aunque sea un caracter', async () => {
    const cuerpo = EJEMPLO.cuerpo.replace('true', 'false');
    await expect(firmaEsValida(base({ cuerpo }))).resolves.toBe(false);
  });

  it('rechaza si el secreto no es el del endpoint', async () => {
    await expect(firmaEsValida(base({ secreto: 'whsec_otroSecretoDistinto00' }))).resolves.toBe(false);
  });

  it('rechaza un aviso viejo: un atacante no puede reenviar uno capturado', async () => {
    const ahoraSegundos = Number.parseInt(EJEMPLO.timestamp, 10) + 3600;
    await expect(firmaEsValida(base({ ahoraSegundos }))).resolves.toBe(false);
  });

  it('rechaza si falta cualquiera de las cabeceras', async () => {
    await expect(firmaEsValida(base({ id: '' }))).resolves.toBe(false);
    await expect(firmaEsValida(base({ firmas: '' }))).resolves.toBe(false);
    await expect(firmaEsValida(base({ timestamp: '' }))).resolves.toBe(false);
  });

  it('rechaza una version de firma que no es v1', async () => {
    const firmas = EJEMPLO.firmaBuena.replace('v1,', 'v2,');
    await expect(firmaEsValida(base({ firmas }))).resolves.toBe(false);
  });

  it('la comparacion en tiempo constante distingue bien', () => {
    expect(igualesEnTiempoConstante('abc', 'abc')).toBe(true);
    expect(igualesEnTiempoConstante('abc', 'abd')).toBe(false);
    expect(igualesEnTiempoConstante('abc', 'abcd')).toBe(false);
  });
});
