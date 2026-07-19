/**
 * Cliente Supabase tipado, único punto de acceso al backend.
 *
 * Nunca se pasa la service_role key al cliente: solo la anon key, protegida por
 * las políticas RLS de la PARTE 1.
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Faltan variables de entorno: define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu .env',
  );
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

/** Bucket de Storage para los avatares de perfil. */
export const AVATAR_BUCKET = 'avatars';

/** Bucket privado para adjuntos de denuncias. */
export const REPORTS_BUCKET = 'reports';
