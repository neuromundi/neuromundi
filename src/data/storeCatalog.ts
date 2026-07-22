/**
 * storeCatalog — clasificación de la Tienda Neuromundi, orientada al
 * neurodesarrollo y la neurodiversidad. `value` = clave canónica indexable.
 */
import type { CatItem } from '@/data/specialistCatalog';

export const STORE_CATEGORIES: CatItem[] = [
  { value: 'sensorial', label: 'Regulación y procesamiento sensorial' },
  { value: 'comunicacion', label: 'Comunicación y lenguaje (CAA/SAAC)' },
  { value: 'cognitivo', label: 'Cognición y funciones ejecutivas' },
  { value: 'motricidad', label: 'Motricidad y psicomotricidad' },
  { value: 'autonomia', label: 'Autonomía y vida diaria' },
  { value: 'socioemocional', label: 'Habilidades sociales y emocionales' },
  { value: 'juego', label: 'Juego y ocio inclusivo' },
  { value: 'aprendizaje', label: 'Aprendizaje y material educativo' },
  { value: 'libros', label: 'Libros y recursos' },
  { value: 'tecnologia', label: 'Tecnología de apoyo' },
  { value: 'vestimenta', label: 'Ropa y accesorios adaptados' },
  { value: 'alimentacion', label: 'Alimentación y utensilios adaptados' },
  { value: 'eventos', label: 'Boletos y eventos' },
  { value: 'otro', label: 'Otro' },
];
