// ============================================================================
// Supabase Edge Function: delete-account
// Borra la cuenta del usuario autenticado. El borrado de auth.users requiere la
// service_role key (NO se expone al cliente), por eso vive en una Edge Function.
// Al eliminar el usuario, el ON DELETE CASCADE de `profiles` arrastra su perfil
// y datos asociados.
//
// Despliegue:
//   supabase functions deploy delete-account
// (usa automáticamente SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY del entorno).
//
// Se invoca desde el cliente con supabase.functions.invoke('delete-account').
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido' });

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return json(401, { error: 'No autenticado' });

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!serviceKey) return json(500, { error: 'Falta SUPABASE_SERVICE_ROLE_KEY en el servidor.' });

  // 1) Identificar al usuario a partir de su propio JWT.
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json(401, { error: 'Sesión inválida' });

  const userId = userData.user.id;

  // 2) Borrar el usuario con privilegios de servicio (cascada sobre profiles).
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) return json(500, { error: 'No se pudo eliminar la cuenta.', detail: delErr.message });

  return json(200, { ok: true });
});
