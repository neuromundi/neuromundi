// ============================================================================
// Edge Function · reclamar-ficha
//
// Crea la cuenta SOLO cuando la persona acepta la invitación. Hasta entonces
// no existe ningún usuario: ni cuenta fantasma ni correo inventado.
//
// Desplegar:
//   supabase functions deploy reclamar-ficha
//   supabase secrets set SITE_URL=https://neuromundi.com
//
// La función usa SUPABASE_SERVICE_ROLE_KEY, que Supabase inyecta sola. No la
// escribas en el código ni la subas al repositorio.
// ============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('SITE_URL') ?? '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST')    return json({ error: 'método no permitido' }, 405);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  let token = '';
  try { ({ token } = await req.json()); } catch { return json({ error: 'cuerpo inválido' }, 400); }
  if (!token || typeof token !== 'string') return json({ error: 'falta el token' }, 400);

  // 1 · ¿La invitación sigue viva? La función valida vigencia y estado.
  const { data: fichas, error: eFicha } = await admin.rpc('ficha_por_token', { p_token: token });
  if (eFicha) return json({ error: 'no se pudo leer la ficha' }, 500);
  const ficha = fichas?.[0];
  if (!ficha) return json({ error: 'invitación no válida, ya usada o vencida' }, 410);

  // 2 · Crear la cuenta con SU correo. Sin confirmar de oficio: el enlace mágico
  //     que recibe a continuación es la confirmación, y así queda constancia de
  //     que alguien con acceso a ese buzón aceptó.
  const { data: creado, error: eUser } = await admin.auth.admin.createUser({
    email: ficha.correo,
    email_confirm: false,
    user_metadata: { origen: 'ficha_directorio', ficha_id: ficha.ficha_id },
  });

  let userId = creado?.user?.id;

  // Si ya existía una cuenta con ese correo, se reutiliza en vez de duplicarla.
  if (eUser && /already|exist/i.test(eUser.message)) {
    const { data: lista } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    userId = lista?.users.find((u) => u.email?.toLowerCase() === ficha.correo.toLowerCase())?.id;
  } else if (eUser) {
    return json({ error: 'no se pudo crear la cuenta' }, 500);
  }
  if (!userId) return json({ error: 'no se pudo resolver la cuenta' }, 500);

  // 3 · Crear su perfil con los datos de la ficha. is_published queda en false:
  //     sale al público cuando la persona lo complete y lo publique. Nada suyo
  //     se muestra como verificado hasta que ella lo confirme.
  const { error: ePerfil } = await admin.from('profiles').upsert({
    id: userId,
    role: 'provider',
    full_name: ficha.nombre,
    business_name: ficha.nombre,
    provider_type: ficha.provider_type,
    phone: ficha.telefono,
    website: ficha.sitio_web,
    address: ficha.direccion,
    state: ficha.estado,
    municipality: ficha.ciudad,
    city: ficha.ciudad,
    country: 'MX',
    services_offered: ficha.especializacion,
    membership_status: 'exempt',
    is_published: false,
  }, { onConflict: 'id' });
  if (ePerfil) return json({ error: 'no se pudo crear el perfil' }, 500);

  // 4 · Marcar la ficha como reclamada: deja de aparecer suelta en el buscador.
  const { data: ok } = await admin.rpc('marcar_ficha_reclamada', { p_token: token, p_perfil: userId });
  if (!ok) return json({ error: 'la invitación dejó de ser válida' }, 410);

  // 5 · Enlace de acceso a su propio perfil.
  const { data: enlace, error: eLink } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: ficha.correo,
    options: { redirectTo: `${Deno.env.get('SITE_URL')}/ajustes?bienvenida=1` },
  });
  if (eLink) return json({ ok: true, aviso: 'perfil creado; pide acceso desde la portada' });

  return json({ ok: true, perfil_id: userId, enlace: enlace?.properties?.action_link ?? null });
});
