/**
 * Utilidades transversales: merge de clases, mapeo de color del EVS, debounce,
 * optimización de imágenes a WebP y un logger condicional.
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Combina clases de Tailwind resolviendo conflictos (p. ej. px-2 vs px-4). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ── EVS / color ──────────────────────────────────────────────────────────────

/** Tokens de color del EVS (degradado 1→5), espejo de `theme.colors.evs`. */
export const EVS_COLORS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#84cc16',
  5: '#22c55e',
};

/**
 * Redondea un score continuo (1–5) al escalón de color más cercano.
 * @param score Promedio del EVS, p. ej. 4.7
 */
export function evsColor(score: number | null | undefined): string {
  if (score == null || Number.isNaN(score)) return '#94a3b8'; // slate-400 neutro
  const step = Math.min(5, Math.max(1, Math.round(score))) as 1 | 2 | 3 | 4 | 5;
  return EVS_COLORS[step];
}

/** Etiqueta humana para un score 1–5. */
export function scoreLabel(score: number): string {
  const labels = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'];
  return labels[Math.min(5, Math.max(1, Math.round(score)))] ?? '';
}

// ── Formato ──────────────────────────────────────────────────────────────────

import { currentLocale } from '@/i18n';

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(currentLocale(), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(currentLocale(), {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** Formatea el valor de un descuento de forma legible. */
export function formatDiscount(
  type: 'percentage' | 'fixed' | 'freebie',
  value: number | null,
): string {
  switch (type) {
    case 'percentage':
      return value != null ? `${value}% de descuento` : 'Descuento';
    case 'fixed':
      return value != null
        ? `$${value.toLocaleString('es-MX')} MXN de descuento`
        : 'Descuento';
    case 'freebie':
      return 'Regalo / cortesía';
  }
}

/**
 * Versión i18n de la etiqueta de descuento. Recibe la función `t` de
 * react-i18next; usa las claves del grupo `discount`. Sustituye a
 * `formatDiscount` a medida que se internacionaliza cada pantalla.
 */
export function discountLabel(
  t: (key: string, opts?: Record<string, unknown>) => string,
  type: 'percentage' | 'fixed' | 'freebie',
  value: number | null,
): string {
  switch (type) {
    case 'percentage':
      return value != null ? t('discount.percentage', { value }) : t('discount.generic');
    case 'fixed':
      return value != null
        ? t('discount.fixed', { value: value.toLocaleString() })
        : t('discount.generic');
    case 'freebie':
      return t('discount.freebie');
  }
}

// ── Timing ───────────────────────────────────────────────────────────────────

/**
 * Debounce genérico. Útil para el buscador del directorio (300ms recomendado).
 * Devuelve la función envuelta y un `.cancel()` para limpiar en cleanup.
 */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  wait = 300,
): ((...args: A) => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return debounced;
}

// ── Imágenes ─────────────────────────────────────────────────────────────────

export interface OptimizeImageOptions {
  /** Lado mayor máximo en píxeles. */
  maxDimension?: number;
  /** Calidad WebP 0–1. */
  quality?: number;
  /** Tamaño máximo aceptado del archivo de entrada en bytes. */
  maxInputBytes?: number;
}

/**
 * Reescala y convierte una imagen a WebP en el cliente antes de subirla a
 * Storage. Cumple la restricción crítica: máx 1MB y formato WebP.
 *
 * @throws Error si el archivo excede `maxInputBytes` o no es una imagen válida.
 */
export async function optimizeImageToWebp(
  file: File,
  opts: OptimizeImageOptions = {},
): Promise<File> {
  const {
    maxDimension = 512,
    quality = 0.85,
    maxInputBytes = 8 * 1024 * 1024,
  } = opts;

  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen.');
  }
  if (file.size > maxInputBytes) {
    throw new Error('La imagen es muy pesada. Elige un archivo más ligero.');
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen en este dispositivo.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', quality),
  );
  if (!blob) throw new Error('No se pudo convertir la imagen.');

  const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
  return new File([blob], name, { type: 'image/webp' });
}

// ── Logger condicional (sin console.log en producción) ───────────────────────

const isDev = import.meta.env.DEV;

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.debug('[neuro]', ...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info('[neuro]', ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn('[neuro]', ...args);
  },
  error: (...args: unknown[]) => {
    console.error('[neuro]', ...args);
  },
};

/** Normaliza errores desconocidos a un mensaje legible para la UI. */
export function toMessage(error: unknown, fallback = 'Algo no salió bien.'): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
}

// ── Geo ──────────────────────────────────────────────────────────────────────

/** Coordenadas por defecto: Ciudad de México (fallback de geolocalización). */
export const DEFAULT_CENTER = { lat: 19.4326, lng: -99.1332 };

/** Distancia en kilómetros entre dos puntos (fórmula de haversine). */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ── Exportación CSV (cliente) ────────────────────────────────────────────────

function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value);
  // Escapar comillas y envolver si hay separadores o saltos de línea.
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Genera y descarga un CSV a partir de filas en memoria.
 * @param filename Nombre del archivo (se añade .csv si falta).
 * @param headers  Cabeceras en orden.
 * @param rows     Filas como arreglos alineados a las cabeceras.
 */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null)[][],
): void {
  const lines = [headers, ...rows].map((r) => r.map(csvCell).join(','));
  const csv = '\uFEFF' + lines.join('\n'); // BOM para acentos en Excel
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * providerOtherText — junta los textos "Otro (especifica)" que el proveedor
 * escribió en provider_details (claves que terminan en `_other`). Se usa para
 * que esos valores libres sean buscables en el directorio.
 */
export function providerOtherText(pd: Record<string, unknown> | null | undefined): string {
  if (!pd) return '';
  return Object.entries(pd)
    .filter(([k, v]) => k.endsWith('_other') && typeof v === 'string')
    .map(([, v]) => v as string)
    .join(' ');
}
