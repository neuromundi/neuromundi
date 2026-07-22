import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  captureRefFromUrl,
  getStoredReferrer,
  clearStoredReferrer,
  parseRefCode,
  referralUrl,
  formatMemberNo,
  REFERRAL_VALIDITY_DAYS,
} from './referral';

const DAY = 24 * 60 * 60 * 1000;

/** Adelanta el reloj sin temporizadores falsos: basta con espiar Date.now. */
function travel(ms: number) {
  const base = Date.now();
  vi.spyOn(Date, 'now').mockReturnValue(base + ms);
}

function visitWithRef(ref: string) {
  window.history.replaceState({}, '', `/?ref=${ref}`);
  captureRefFromUrl();
}

describe('enlace de recomendación', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('formatea y parsea el folio', () => {
    expect(formatMemberNo(123)).toBe('NM-000123');
    expect(parseRefCode('NM-000123')).toBe(123);
    expect(parseRefCode('123')).toBe(123);
    expect(parseRefCode('abc')).toBeNull();
    expect(parseRefCode(null)).toBeNull();
  });

  it('el enlace incluye el folio', () => {
    expect(referralUrl(123)).toContain('ref=NM-000123');
  });

  it('captura el ?ref= de la URL', () => {
    visitWithRef('NM-000123');
    expect(getStoredReferrer()).toBe(123);
  });

  it(`sigue vigente antes de ${REFERRAL_VALIDITY_DAYS} días`, () => {
    visitWithRef('NM-000123');
    travel(6 * DAY);
    expect(getStoredReferrer()).toBe(123);
  });

  it(`caduca pasados ${REFERRAL_VALIDITY_DAYS} días`, () => {
    visitWithRef('NM-000123');
    travel(8 * DAY);
    expect(getStoredReferrer()).toBeNull();
  });

  it('un enlace caducado se borra del almacenamiento', () => {
    visitWithRef('NM-000123');
    travel(8 * DAY);
    expect(getStoredReferrer()).toBeNull();
    vi.restoreAllMocks();
    // Ya no queda rastro aunque el reloj vuelva a la normalidad.
    expect(getStoredReferrer()).toBeNull();
  });

  it('un referente sin sello de tiempo se considera caducado', () => {
    localStorage.setItem('nm_referrer', '123');
    expect(getStoredReferrer()).toBeNull();
  });

  it('clearStoredReferrer limpia folio y sello', () => {
    visitWithRef('NM-000123');
    clearStoredReferrer();
    expect(getStoredReferrer()).toBeNull();
  });
});
