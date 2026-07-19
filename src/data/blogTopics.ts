/**
 * blogTopics — taxonomía editorial del Blog Neuromundi (neurodiversidad y
 * neurodesarrollo). `value` = clave canónica indexable (content_posts.topic y
 * profiles.interests). Se traduce con useCatLabel con reserva al label español.
 */
import type { CatItem } from '@/data/specialistCatalog';

export const BLOG_TOPICS: CatItem[] = [
  { value: 'diagnostico', label: 'Diagnóstico y detección temprana' },
  { value: 'crianza', label: 'Crianza y familia' },
  { value: 'educacion', label: 'Educación e inclusión escolar' },
  { value: 'sensorial', label: 'Regulación sensorial' },
  { value: 'comunicacion', label: 'Comunicación y lenguaje' },
  { value: 'emocional', label: 'Bienestar emocional' },
  { value: 'terapias', label: 'Terapias e intervención' },
  { value: 'autonomia', label: 'Autonomía y vida adulta' },
  { value: 'derechos', label: 'Derechos y trámites' },
  { value: 'tecnologia', label: 'Tecnología de apoyo' },
  { value: 'historias', label: 'Historias y testimonios' },
  { value: 'investigacion', label: 'Investigación y ciencia' },
];
