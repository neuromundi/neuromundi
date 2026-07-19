import { describe, it, expect, beforeEach } from 'vitest';
import {
  formatMemberNo,
  parseRefCode,
  referralUrl,
  captureRefFromUrl,
  getStoredReferrer,
  clearStoredReferrer,
} from './referral';

describe('formatMemberNo', () => {
  it('formatea con relleno a 6 dígitos', () => {
    expect(formatMemberNo(123)).toBe('NM-000123');
    expect(formatMemberNo(1)).toBe('NM-000001');
    expect(formatMemberNo(1234567)).toBe('NM-1234567');
  });
});

describe('parseRefCode', () => {
  it('extrae el número de "NM-000123" o "123"', () => {
    expect(parseRefCode('NM-000123')).toBe(123);
    expect(parseRefCode('123')).toBe(123);
    expect(parseRefCode('  nm-000045 ')).toBe(45);
  });
  it('devuelve null ante entradas inválidas', () => {
    expect(parseRefCode(null)).toBeNull();
    expect(parseRefCode(undefined)).toBeNull();
    expect(parseRefCode('')).toBeNull();
    expect(parseRefCode('abc')).toBeNull();
    expect(parseRefCode('NM-000000')).toBeNull(); // 0 no es válido
  });
});

describe('referralUrl', () => {
  it('incluye el folio formateado como parámetro ref', () => {
    expect(referralUrl(123)).toContain('/?ref=NM-000123');
  });
});

describe('captura/almacenamiento del referente', () => {
  beforeEach(() => { clearStoredReferrer(); });

  it('captura ?ref= de la URL y lo persiste; luego se puede leer y limpiar', () => {
    window.history.replaceState({}, '', '/?ref=NM-000123');
    captureRefFromUrl();
    expect(getStoredReferrer()).toBe(123);
    clearStoredReferrer();
    expect(getStoredReferrer()).toBeNull();
  });

  it('no guarda nada si el ref es inválido', () => {
    window.history.replaceState({}, '', '/?ref=abc');
    captureRefFromUrl();
    expect(getStoredReferrer()).toBeNull();
  });
});
