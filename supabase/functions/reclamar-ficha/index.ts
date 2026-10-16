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

// El sitio se sirve con y sin www. Si el origen permitido es solo uno de los
// dos, el navegador bloquea la petición desde el otro y el fallo se ve como un
// error genérico. Se aceptan ambos, y se devuelve el que pidió.
const SITIO = Deno.env.get('SITE_URL') ?? 'https://www.neuromundi.com';
const permitidos = new Set([
  SITIO,
  SITIO.replace('://www.', '://'),
  SITIO.replace('://', '://www.'),
  'http://localhost:5173',
]);

function corsDe(req: Request) {
  const origen = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': permitidos.has(origen) ? origen : SITIO,
    'Vary': 'Origin',
    // Deben ir TODOS los encabezados que manda la página. Si falta uno, el
    // navegador aprueba el OPTIONS pero nunca envía el POST, y el fallo se ve
    // como un error genérico sin nada en los registros.
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

Deno.serve(async (req) => {
  const cors = corsDe(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });

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

  // Rate-limit por IP: máx 10 reclamos por hora. Evita el abuso de creación de
  // cuentas / envío de magic-links. Reutiliza support_throttle con prefijo.
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from('support_throttle')
      .select('id', { count: 'exact', head: true })
      .eq('ip', `reclamar:${ip}`)
      .gte('created_at', since);
    if ((count ?? 0) >= 10) return json({ error: 'demasiados intentos, intenta más tarde' }, 429);
    await admin.from('support_throttle').insert({ ip: `reclamar:${ip}` });
  } catch (_) {
    // Si el control de tasa falla, no bloqueamos el reclamo legítimo.
  }

  // 1 · ¿La invitación sigue viva? La función valida vigencia y estado.
  const { data: fichas, error: eFicha } = await admin.rpc('ficha_por_token', { p_token: token });
  if (eFicha) return json({ error: 'no se pudo leer la ficha' }, 500);
  const ficha = fichas?.[0];
  if (!ficha) return json({ error: 'invitación no válida, ya usada o vencida' }, 410);

  // País de la ficha. ficha_por_token no lo devuelve y cambiar su tipo de
  // retorno exige borrarla, así que vive en su propio ayudante (migración 0209).
  const { data: paisRpc } = await admin.rpc('ficha_pais_por_token', { p_token: token });
  const paisFicha = (typeof paisRpc === 'string' && paisRpc.trim()) ? paisRpc.trim() : 'México';

  // 2 · Crear la cuenta con SU correo. Sin confirmar de oficio: el enlace mágico
  //     que recibe a continuación es la confirmación, y así queda constancia de
  //     que alguien con acceso a ese buzón aceptó.
  const { data: creado, error: eUser } = await admin.auth.admin.createUser({
    email: ficha.correo,
    email_confirm: false,
    user_metadata: { origen: 'ficha_directorio', ficha_id: ficha.ficha_id },
  });

  let userId = creado?.user?.id;

  // SI YA EXISTE UNA CUENTA CON ESE CORREO, AQUI SE PARA.
  //
  // Antes se reutilizaba esa cuenta, se le sobrescribia el perfil con los datos
  // de la ficha y, en el paso 5, se generaba un enlace magico que se devolvia
  // EN EL CUERPO DE LA RESPUESTA. Quien tuviera el token de invitacion quedaba
  // con un enlace que lo iniciaba sesion como esa persona, sin haber tenido
  // nunca acceso a su buzon: el token equivalia a la contrasena de la cuenta.
  // (Auditoria del 15 oct 2026, hallazgo C-4.)
  //
  // El caso legitimo —alguien que ya se registro por su cuenta y ahora quiere
  // reclamar su ficha— se resuelve entrando a su sesion, no por aqui.
  if (eUser && /already|exist/i.test(eUser.message)) {
    return json({
      error: 'Ya existe una cuenta de Neuromundi con ese correo. Inicie sesión con ella y reclame su ficha desde su panel.',
      code: 'cuenta_existente',
    }, 409);
  }
  if (eUser) return json({ error: 'no se pudo crear la cuenta' }, 500);
  if (!userId) return json({ error: 'no se pudo resolver la cuenta' }, 500);

  // 3 · Crear su perfil con los datos de la ficha.
  //
  //     A quién se le pide cuota lo decide el sector, que viene del propio dato:
  //     el SCIAN del INEGI distingue sector público de privado en el código
  //     (611182 pública, 611181 privada), y para las fichas de investigación
  //     propia se usa la figura jurídica del nombre.
  //
  //     · publico y social  → 'exempt': no se les pide nada.
  //     · privado           → 'pending' con 15 días, y la plataforma le muestra
  //                           la tarifa que le toca por tipo de perfil y país.
  const cobrable = ficha.sector === 'privado';
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
    // Nombre del país, NO código ISO: el directorio segmenta con
    // query.eq('country', country) usando MEXICO_NAME='México' (src/data/countries.ts),
    // y las fichas se guardan con country='México' (migración 0131). Con 'MX' el
    // perfil reclamado no casa con el filtro y desaparecería del directorio con
    // México seleccionado (el valor por defecto).
    //
    // CORREGIDO (14 oct 2026): antes decía 'México' a secas, para TODA ficha.
    // Con las 218 fichas de Latinoamérica eso habría registrado a un prestador
    // chileno como mexicano y le habría cobrado en pesos mexicanos, no lo que
    // le cotizó su correo. El país sale ahora de la propia ficha.
    country: paisFicha,
    services_offered: ficha.especializacion,
    // 'pending' con fecha límite: así useMembership calcula la cotización y las
    // opciones de pago, y la plataforma le muestra la cuota como a cualquier
    // proveedor. Con 'exempt' el hook se las salta y no aparece nada que pagar.
    membership_status: cobrable ? 'pending' : 'exempt',
    membership_due_at: cobrable
      ? new Date(Date.now() + 15 * 86400000).toISOString()
      : null,
    // NO publicar aquí. El disparador trg_gate_publicacion rechaza
    // is_published = true mientras falten foto, descripción, teléfono, país o
    // la cuota, y ese rechazo tumbaba TODO el reclamo con un 500 genérico
    // ("Algo falló de nuestro lado"). Quien publica es publicar_si_procede(),
    // que marcar_ficha_reclamada() llama en el paso 4 y que solo publica
    // cuando el perfil ya cumple. Mientras tanto la ficha del directorio
    // sigue visible: directorio_publico solo la oculta cuando el perfil
    // reclamante ya está publicado.
    is_published: false,
    // ACEPTACION DEL REGLAMENTO. Sin esto la aplicacion considera que falta el
    // alta y, en vez de la aplicacion, monta a pantalla completa el formulario
    // de onboarding, cuyo unico boton de salida BORRA la cuenta recien creada.
    // El titular ya acepto: recibio el correo, abrio su enlace y pulso para
    // reclamar su ficha. (Auditoria del 15 oct 2026, hallazgo C-8.)
    rules_version_accepted: '2026-07',
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
