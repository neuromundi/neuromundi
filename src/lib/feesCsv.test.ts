import { describe, it, expect } from 'vitest';
import {
  parseCsv,
  toCsv,
  templateCsv,
  parseAmount,
  detectDelimiter,
  splitCsvLine,
  type FeeCsvRow,
} from './feesCsv';

const base: FeeCsvRow = {
  pais: 'México',
  tipo: 'medical_specialist',
  clase: 'founder',
  moneda: 'MXN',
  mensual: 1000,
  anual: 10000,
  anual_referencia: 12000,
  sin_centavos: false,
};

describe('detectDelimiter', () => {
  it('reconoce punto y coma, coma y tabulador', () => {
    expect(detectDelimiter('pais;tipo;clase')).toBe(';');
    expect(detectDelimiter('pais,tipo,clase')).toBe(',');
    expect(detectDelimiter('pais\ttipo\tclase')).toBe('\t');
  });

  it('ante una sola columna asume punto y coma', () => {
    expect(detectDelimiter('pais')).toBe(';');
  });
});

describe('splitCsvLine', () => {
  it('respeta las comillas', () => {
    expect(splitCsvLine('a;"b;c";d', ';')).toEqual(['a', 'b;c', 'd']);
  });

  it('maneja comillas escapadas', () => {
    expect(splitCsvLine('a;"di ""hola""";b', ';')).toEqual(['a', 'di "hola"', 'b']);
  });
});

describe('parseAmount', () => {
  it('lee formato con punto decimal', () => {
    expect(parseAmount('1234.56', false)).toBe(1234.56);
  });

  it('lee formato con coma decimal (Excel en español)', () => {
    expect(parseAmount('1234,56', true)).toBe(1234.56);
  });

  it('lee miles con punto y decimal con coma', () => {
    expect(parseAmount('1.234,56', true)).toBe(1234.56);
  });

  it('lee miles con coma y decimal con punto', () => {
    expect(parseAmount('1,234.56', false)).toBe(1234.56);
  });

  it('ignora símbolos de moneda', () => {
    expect(parseAmount('$ 1,000.00', false)).toBe(1000);
  });

  it('devuelve null si no hay número', () => {
    expect(parseAmount('', false)).toBeNull();
    expect(parseAmount('abc', false)).toBeNull();
  });
});

describe('toCsv / parseCsv (ida y vuelta)', () => {
  it('lo que se exporta se vuelve a leer igual', () => {
    const { rows, errors } = parseCsv(toCsv([base]));
    expect(errors).toEqual([]);
    expect(rows).toEqual([base]);
  });

  it('la plantilla de ejemplo es válida', () => {
    const { rows, errors } = parseCsv(templateCsv());
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
  });

  it('el CSV lleva BOM para que Excel respete los acentos', () => {
    expect(toCsv([base]).charCodeAt(0)).toBe(0xfeff);
  });
});

describe('parseCsv — tolerancia', () => {
  it('acepta separador por coma', () => {
    const csv = 'pais,tipo,clase,moneda,mensual,anual,anual_referencia,sin_centavos\nMéxico,medical_specialist,founder,MXN,1000,10000,12000,no';
    const { rows, errors } = parseCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0].mensual).toBe(1000);
  });

  it('acepta tipo y clase en español', () => {
    const csv = 'pais;tipo;clase;moneda;mensual;anual;anual_referencia;sin_centavos\nMéxico;medico;fundador;MXN;1000;10000;12000;no';
    const { rows, errors } = parseCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0].tipo).toBe('medical_specialist');
    expect(rows[0].clase).toBe('founder');
  });

  it('deriva anual (×10) y referencia (×12) si vienen vacíos', () => {
    const csv = 'pais;tipo;clase;moneda;mensual;anual;anual_referencia;sin_centavos\nMéxico;medical_specialist;ordinary;MXN;1500;;;no';
    const { rows, errors } = parseCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0].anual).toBe(15000);
    expect(rows[0].anual_referencia).toBe(18000);
  });

  it('acepta la columna sin_centavos ausente', () => {
    const csv = 'pais;tipo;clase;moneda;mensual;anual;anual_referencia\nMéxico;medical_specialist;founder;MXN;1000;10000;12000';
    const { rows, errors } = parseCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0].sin_centavos).toBe(false);
  });

  it('ignora líneas en blanco', () => {
    const csv = toCsv([base]) + '\r\n\r\n';
    expect(parseCsv(csv).rows).toHaveLength(1);
  });
});

describe('parseCsv — errores', () => {
  it('avisa si faltan columnas obligatorias', () => {
    const { errors } = parseCsv('pais;tipo\nMéxico;medical_specialist');
    expect(errors[0].motivo).toContain('Faltan columnas');
  });

  it('avisa del archivo vacío', () => {
    expect(parseCsv('').errors[0].motivo).toContain('vacío');
  });

  it('reporta el número de línea del renglón malo', () => {
    const csv = [
      'pais;tipo;clase;moneda;mensual;anual;anual_referencia;sin_centavos',
      'México;medical_specialist;founder;MXN;1000;10000;12000;no',
      'México;astronauta;founder;MXN;1000;10000;12000;no',
    ].join('\n');
    const { rows, errors } = parseCsv(csv);
    // La fila buena se conserva: un renglón malo no tumba el archivo.
    expect(rows).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0].linea).toBe(3);
    expect(errors[0].motivo).toContain('Tipo no reconocido');
  });

  it('rechaza moneda que no sea de 3 letras', () => {
    const csv = 'pais;tipo;clase;moneda;mensual;anual;anual_referencia;sin_centavos\nMéxico;medical_specialist;founder;pesos;1000;10000;12000;no';
    expect(parseCsv(csv).errors[0].motivo).toContain('Moneda inválida');
  });

  it('rechaza clase desconocida', () => {
    const csv = 'pais;tipo;clase;moneda;mensual;anual;anual_referencia;sin_centavos\nMéxico;medical_specialist;vip;MXN;1000;10000;12000;no';
    expect(parseCsv(csv).errors[0].motivo).toContain('Clase no reconocida');
  });

  it('rechaza importe mensual inválido', () => {
    const csv = 'pais;tipo;clase;moneda;mensual;anual;anual_referencia;sin_centavos\nMéxico;medical_specialist;founder;MXN;;10000;12000;no';
    expect(parseCsv(csv).errors[0].motivo).toContain('mensual');
  });

  it('rechaza fila sin país', () => {
    const csv = 'pais;tipo;clase;moneda;mensual;anual;anual_referencia;sin_centavos\n;medical_specialist;founder;MXN;1000;10000;12000;no';
    expect(parseCsv(csv).errors[0].motivo).toContain('país');
  });
});
