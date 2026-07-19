// ============================================================================
// Supabase Edge Function: send-product-rejection
// Notifica al PROVEEDOR por correo SOLO cuando su producto NO es aprobado.
// (Las aprobaciones NO se notifican por correo: el producto simplemente se
//  publica automáticamente en la tienda.)
//
// Seguridad: solo un usuario con rol 'admin' puede invocarla. Usa el service
// role para leer el correo del proveedor desde auth y enviar con Resend.
//
// Variables de entorno:
//   RESEND_API_KEY           → API key de Resend (obligatoria).
//   SUPPORT_FROM             → remitente verificado en Resend.
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (inyectadas).
//
// Despliegue:
//   supabase functions deploy send-product-rejection
//
// Invocación desde el cliente (admin):
//   supabase.functions.invoke('send-product-rejection', { body: { productId, reason } })
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPPORT_FROM = Deno.env.get('SUPPORT_FROM') ?? 'Neuromundi <admin@neuromundi.com>';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';

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

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido' });
  if (!RESEND_API_KEY) return json(500, { error: 'Falta configurar RESEND_API_KEY.' });

  let payload: { productId?: string; reason?: string };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: 'Cuerpo inválido.' });
  }
  const productId = (payload.productId ?? '').trim();
  const reason = (payload.reason ?? '').trim();
  if (!productId) return json(400, { error: 'Falta productId.' });

  // 1) Verificar que quien llama es admin (con su propio JWT).
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return json(401, { error: 'No autenticado.' });

  const asUser = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: me } = await asUser.auth.getUser();
  if (!me?.user) return json(401, { error: 'No autenticado.' });

  const { data: myProfile } = await asUser
    .from('profiles')
    .select('role')
    .eq('id', me.user.id)
    .maybeSingle();
  if (myProfile?.role !== 'admin') return json(403, { error: 'Solo el administrador puede notificar.' });

  // 2) Con service role: leer producto + vendedor + correo del vendedor.
  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { data: product } = await admin
    .from('products')
    .select('name, vendor_id')
    .eq('id', productId)
    .maybeSingle();
  if (!product) return json(404, { error: 'Producto no encontrado.' });

  const { data: vendorUser, error: vErr } = await admin.auth.admin.getUserById(product.vendor_id);
  if (vErr || !vendorUser?.user?.email) {
    return json(404, { error: 'No se encontró el correo del proveedor.' });
  }
  const to = vendorUser.user.email;

  // 3) Enviar correo de NO aprobación.
  const subject = `Tu producto "${product.name}" no fue aprobado`;
  const html = `
    <h2>Revisión de tu producto en Neuromundi</h2>
    <p>Hola,</p>
    <p>Tu producto <strong>${escapeHtml(product.name)}</strong> no fue aprobado para publicarse en la tienda.</p>
    ${reason ? `<p><strong>Motivo:</strong></p><p style="white-space:pre-wrap;border-left:3px solid #ddd;padding-left:12px">${escapeHtml(reason)}</p>` : ''}
    <p>Puedes ajustar la publicación y volver a enviarla a revisión desde tu panel en Neuromundi.</p>
    <p style="color:#888;font-size:12px">Recuerda que no se admiten "productos milagro" ni afirmaciones de cura, diagnóstico o resultados garantizados.</p>
  `;
  const text =
    `Tu producto "${product.name}" no fue aprobado para la tienda.` +
    (reason ? `\n\nMotivo:\n${reason}` : '') +
    `\n\nPuedes ajustarlo y reenviarlo a revisión desde tu panel.`;

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: SUPPORT_FROM, to: [to], subject, html, text }),
  });
  if (!resp.ok) {
    const detail = await resp.text();
    return json(502, { error: 'El proveedor de correo rechazó el envío.', detail });
  }
  return json(200, { ok: true });
});
