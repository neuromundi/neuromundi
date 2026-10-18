/**
 * Zonas horarias que se ofrecen al crear un evento. No es la lista completa
 * del mundo: son las de los países donde está la comunidad, para que elegir
 * sea rápido. Dejar la opción vacía significa «muéstralo en la hora de quien
 * lo lea», que es lo razonable para un evento en línea.
 */
export interface ZonaHoraria { value: string; label: string }

export const ZONAS_HORARIAS: ZonaHoraria[] = [
  { value: 'Europe/Madrid', label: 'España (Madrid)' },
  { value: 'Atlantic/Canary', label: 'España (Canarias)' },
  { value: 'Europe/Lisbon', label: 'Portugal (Lisboa)' },
  { value: 'America/Mexico_City', label: 'México (Ciudad de México)' },
  { value: 'America/Tijuana', label: 'México (Tijuana)' },
  { value: 'America/Guatemala', label: 'Guatemala, El Salvador, Honduras, Costa Rica' },
  { value: 'America/Panama', label: 'Panamá' },
  { value: 'America/Havana', label: 'Cuba' },
  { value: 'America/Santo_Domingo', label: 'República Dominicana' },
  { value: 'America/Puerto_Rico', label: 'Puerto Rico' },
  { value: 'America/Bogota', label: 'Colombia, Ecuador, Perú' },
  { value: 'America/Caracas', label: 'Venezuela' },
  { value: 'America/La_Paz', label: 'Bolivia' },
  { value: 'America/Asuncion', label: 'Paraguay' },
  { value: 'America/Santiago', label: 'Chile' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina' },
  { value: 'America/Montevideo', label: 'Uruguay' },
  { value: 'America/Sao_Paulo', label: 'Brasil (São Paulo, Río, Brasilia)' },
  { value: 'America/Manaus', label: 'Brasil (Manaos)' },
  { value: 'America/New_York', label: 'Estados Unidos (Nueva York, Miami)' },
  { value: 'America/Chicago', label: 'Estados Unidos (Chicago, Austin)' },
  { value: 'America/Denver', label: 'Estados Unidos (Denver)' },
  { value: 'America/Los_Angeles', label: 'Estados Unidos (Los Ángeles)' },
  { value: 'America/Toronto', label: 'Canadá (Toronto)' },
];
