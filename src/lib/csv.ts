/**
 * descargarCsv — exporta filas a un archivo CSV que Excel abre bien.
 *
 * Detalles que importan y suelen olvidarse:
 *  · BOM UTF-8 al inicio: sin él, Excel en Windows muestra «Mérida» como
 *    «MÃ©rida». Es la causa número uno de que un respaldo se vea roto.
 *  · Comillas dobles duplicadas dentro de un campo entrecomillado, que es como
 *    el formato escapa una comilla.
 *  · Un valor que empieza por = + - @ se antepone con un apóstrofo: Excel lo
 *    interpretaría como fórmula. Es la inyección CSV, y en un respaldo de datos
 *    de personas no es una curiosidad.
 */
export function descargarCsv(nombre: string, columnas: string[], filas: (string | number | boolean | null | undefined)[][]) {
  const campo = (v: string | number | boolean | null | undefined): string => {
    if (v == null) return '';
    let s = String(v);
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const texto = [columnas.map(campo).join(','), ...filas.map((f) => f.map(campo).join(','))].join('\r\n');
  const blob = new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
