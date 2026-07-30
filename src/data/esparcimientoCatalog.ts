/**
 * esparcimientoCatalog — tipos de lugar de "Esparcimiento" (antes turismo).
 * Cines, restaurantes, museos, parques, hoteles… con adaptaciones sensoriales o
 * cognitivas. El `label` es el respaldo en español; se localiza por i18n con la
 * clave `cat.<value>` (useCatLabel). Toda entrada nueva debe llevar su
 * `cat.<value>` en los 11 locales (paridad 0).
 */
import type { CatItem } from '@/data/specialistCatalog';

export const VENUE_TYPES: CatItem[] = [
  { value: 'cine', label: 'Cine' },
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'cafeteria', label: 'Cafetería' },
  { value: 'plaza_comercial', label: 'Plaza comercial' },
  { value: 'museo', label: 'Museo' },
  { value: 'peluqueria', label: 'Peluquería / barbería' },
  { value: 'parque', label: 'Parque' },
  { value: 'teatro', label: 'Teatro' },
  { value: 'balneario', label: 'Balneario' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'biblioteca', label: 'Biblioteca' },
  { value: 'centro_cultural', label: 'Centro cultural' },
  { value: 'gimnasio', label: 'Gimnasio / deporte' },
  { value: 'otro', label: 'Otro' },
];
