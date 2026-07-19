// ============================================================================
// Supabase Edge Function: purge-expired-files
// Autoborrado del intercambio cifrado: elimina del Storage y de la base los
// archivos cuyo expires_at ya pasó. El servidor solo guardaba cifrado; esto
// garantiza que el cifrado tampoco persista más allá de su vencimiento.
//
// Despliegue: supabase functions deploy purge-expired-files --no-verify-jwt
// Programación: cron cada ~1 h → POST https://<ref>.functions.supabase.co/purge-expired-files
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } },
);

Deno.serve(async () => {
  const { data: expired, error } = await admin
    .from('secure_files')
    .select('id, storage_path')
    .not('expires_at', 'is', null)
    .lte('expires_at', new Date().toISOString())
    .limit(500);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const paths = (expired ?? []).map((f) => f.storage_path);
  if (paths.length > 0) {
    await admin.storage.from('secure').remove(paths);
    await admin.from('secure_files').delete().in('id', (expired ?? []).map((f) => f.id));
  }

  return new Response(JSON.stringify({ purged: paths.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
