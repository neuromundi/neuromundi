/**
 * toolkitDb — acceso a las tablas del Kit de Herramientas que aún no forman
 * parte de los tipos generados de la base de datos (`user_progress`,
 * `specialists`). Reutiliza el mismo cliente/ sesión de Supabase, pero sin el
 * genérico `Database`, para poder consultar estas tablas de forma tipada por
 * nuestra cuenta con `.returns<T>()`.
 *
 * Cuando estas tablas se incorporen a `types/database.ts`, este archivo puede
 * eliminarse y usarse el cliente tipado directamente.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export const toolkitDb = supabase as unknown as SupabaseClient;

/** Fila de progreso de lectura del Kit. */
export interface UserProgressRow {
  user_id: string;
  module_id: string;
  read_at: string;
}

/** Especialista sugerido para un módulo (directorio). */
export interface SpecialistRow {
  id: string;
  full_name: string | null;
  specialty: string | null;
  module_type: string;
  city: string | null;
  avatar_url: string | null;
}
