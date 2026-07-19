/**
 * kCatalog — configuración de los 5 tipos de proveedor del bloque K.
 * Cada tipo aporta su lista de "ofertas" (chips) que se guardan en specialties[]
 * (indexable, buscable por texto). Etiquetas en español.
 */
import type { CatItem } from '@/data/specialistCatalog';

export type KType = 'wellness' | 'tourism' | 'legal' | 'ngo' | 'caregiver';

export const K_OFFERINGS: Record<KType, CatItem[]> = {
  wellness: [
    { value: 'natacion_adaptada', label: 'Natación adaptada' },
    { value: 'equinoterapia', label: 'Equinoterapia' },
    { value: 'yoga_adaptado', label: 'Yoga adaptado' },
    { value: 'artes_marciales', label: 'Artes marciales' },
    { value: 'danza_movimiento', label: 'Danza y movimiento' },
    { value: 'acondicionamiento', label: 'Acondicionamiento físico' },
  ],
  tourism: [
    { value: 'hoteles_sensory', label: 'Hoteles sensory-friendly' },
    { value: 'tours_adaptados', label: 'Tours adaptados' },
    { value: 'campamentos', label: 'Campamentos inclusivos' },
    { value: 'transporte_accesible', label: 'Transporte accesible' },
    { value: 'experiencias_calma', label: 'Experiencias de baja carga sensorial' },
  ],
  legal: [
    { value: 'derechos_discapacidad', label: 'Discapacidad y derechos' },
    { value: 'tutela_curatela', label: 'Tutela / curatela' },
    { value: 'educacion_inclusiva', label: 'Derecho a la educación inclusiva' },
    { value: 'seguridad_social', label: 'Seguridad social / pensiones' },
    { value: 'laboral_inclusivo', label: 'Inclusión laboral' },
  ],
  ngo: [
    { value: 'apoyo_familias', label: 'Apoyo a familias' },
    { value: 'grupos_padres', label: 'Grupos de padres' },
    { value: 'becas', label: 'Becas y ayudas' },
    { value: 'sensibilizacion', label: 'Sensibilización' },
    { value: 'voluntariado', label: 'Voluntariado' },
    { value: 'defensa_derechos', label: 'Defensa de derechos' },
  ],
  caregiver: [
    { value: 'acompanamiento_casa', label: 'Acompañamiento en casa' },
    { value: 'respiro_familiar', label: 'Respiro familiar' },
    { value: 'sombra_escolar', label: 'Apoyo escolar (sombra)' },
    { value: 'cuidado_adultos', label: 'Cuidado de adultos' },
    { value: 'traslados', label: 'Traslados y acompañamiento' },
  ],
};

/** Config visual de cada tipo (icono se asigna en el componente). */
export const K_CONFIG: Record<KType, { color: string; cardColor: string }> = {
  wellness:  { color: 'from-lime-500 to-emerald-600',  cardColor: 'from-lime-500 to-emerald-600' },
  tourism:   { color: 'from-sky-500 to-cyan-600',       cardColor: 'from-sky-500 to-cyan-600' },
  legal:     { color: 'from-slate-600 to-slate-800',    cardColor: 'from-slate-600 to-slate-800' },
  ngo:       { color: 'from-rose-500 to-pink-600',       cardColor: 'from-rose-500 to-pink-600' },
  caregiver: { color: 'from-violet-500 to-purple-600',   cardColor: 'from-violet-500 to-purple-600' },
};

export const K_TYPES: KType[] = ['wellness', 'tourism', 'legal', 'ngo', 'caregiver'];
