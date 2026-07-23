import { describe, it, expect } from 'vitest';
import {
  currencyForCountry,
  levelForAmount,
  hasPhysicalReward,
  amountHasPhysical,
  toMinorUnits,
  LEVEL_REWARDS,
} from './donation';

describe('currencyForCountry', () => {
  it('México (con o sin acento) usa MXN', () => {
    expect(currencyForCountry('México')).toBe('MXN');
    expect(currencyForCountry('mexico')).toBe('MXN');
  });

  it('la eurozona usa EUR (con o sin acento)', () => {
    expect(currencyForCountry('España')).toBe('EUR');
    expect(currencyForCountry('Espana')).toBe('EUR');
    expect(currencyForCountry('Alemania')).toBe('EUR');
    expect(currencyForCountry('Países Bajos')).toBe('EUR');
  });

  it('cualquier otro país cae a USD', () => {
    expect(currencyForCountry('Argentina')).toBe('USD');
    expect(currencyForCountry('Reino Unido')).toBe('USD');
    expect(currencyForCountry(null)).toBe('USD');
    expect(currencyForCountry('')).toBe('USD');
  });
});

describe('levelForAmount (EUR)', () => {
  it('usa la misma escalera que USD', () => {
    expect(levelForAmount(9, 'EUR')).toBeNull();
    expect(levelForAmount(10, 'EUR')).toBe('seed');
    expect(levelForAmount(50, 'EUR')).toBe('ally');
    expect(levelForAmount(150, 'EUR')).toBe('ambassador');
  });
});

describe('levelForAmount (USD)', () => {
  it('bajo el mínimo no da nivel', () => {
    expect(levelForAmount(5, 'USD')).toBeNull();
    expect(levelForAmount(0, 'USD')).toBeNull();
  });

  it('respeta los cuatro escalones del brief', () => {
    expect(levelForAmount(10, 'USD')).toBe('seed');
    expect(levelForAmount(49, 'USD')).toBe('seed');
    expect(levelForAmount(50, 'USD')).toBe('ally');
    expect(levelForAmount(99, 'USD')).toBe('ally');
    expect(levelForAmount(100, 'USD')).toBe('driver');
    expect(levelForAmount(149, 'USD')).toBe('driver');
    expect(levelForAmount(150, 'USD')).toBe('ambassador');
    expect(levelForAmount(1000, 'USD')).toBe('ambassador');
  });
});

describe('levelForAmount (MXN)', () => {
  it('usa su propia escalera', () => {
    expect(levelForAmount(150, 'MXN')).toBeNull();
    expect(levelForAmount(200, 'MXN')).toBe('seed');
    expect(levelForAmount(1000, 'MXN')).toBe('ally');
    expect(levelForAmount(2000, 'MXN')).toBe('driver');
    expect(levelForAmount(3000, 'MXN')).toBe('ambassador');
  });
});

describe('recompensa física', () => {
  it('empieza en el nivel Aliado', () => {
    expect(hasPhysicalReward('seed')).toBe(false);
    expect(hasPhysicalReward('ally')).toBe(true);
    expect(hasPhysicalReward('driver')).toBe(true);
    expect(hasPhysicalReward('ambassador')).toBe(true);
    expect(hasPhysicalReward(null)).toBe(false);
  });

  it('atajo por monto: $49 USD no, $50 sí', () => {
    expect(amountHasPhysical(49, 'USD')).toBe(false);
    expect(amountHasPhysical(50, 'USD')).toBe(true);
  });

  it('en MXN el disparo físico es a los 1000', () => {
    expect(amountHasPhysical(999, 'MXN')).toBe(false);
    expect(amountHasPhysical(1000, 'MXN')).toBe(true);
  });
});

describe('toMinorUnits', () => {
  it('multiplica por 100 en monedas con decimales', () => {
    expect(toMinorUnits(10, 'USD')).toBe(1000);
    expect(toMinorUnits(150.5, 'USD')).toBe(15050);
  });
});

describe('LEVEL_REWARDS', () => {
  it('el nivel Semilla no incluye recompensas físicas', () => {
    expect(LEVEL_REWARDS.seed).not.toContain('donate.reward.pin');
    expect(LEVEL_REWARDS.seed).not.toContain('donate.reward.mug');
  });

  it('Aliado añade el pin', () => {
    expect(LEVEL_REWARDS.ally).toContain('donate.reward.pin');
    expect(LEVEL_REWARDS.ally).not.toContain('donate.reward.mug');
  });

  it('Impulsor añade la taza', () => {
    expect(LEVEL_REWARDS.driver).toContain('donate.reward.mug');
  });

  it('Embajador tiene mención destacada y extra', () => {
    expect(LEVEL_REWARDS.ambassador).toContain('donate.reward.wallFeatured');
    expect(LEVEL_REWARDS.ambassador).toContain('donate.reward.ambassadorExtra');
  });
});
