// ============================================================================
// Supabase Edge Function: wallet-pass  (Neuromundi ID — Fase 3, ANDAMIAJE)
// Genera el pase de la Neuromundi ID para Apple Wallet (.pkpass firmado) o
// Google Wallet (enlace "Guardar" con JWT firmado). Es un ANDAMIAJE: funciona en
// cuanto se configuran los secrets; si faltan, responde 501 con la lista exacta.
//
// Invocación (front, usuario con sesión):
//   supabase.functions.invoke('wallet-pass', { body: { platform: 'apple' | 'google' } })
//   · apple  → devuelve el binario .pkpass (Content-Type application/vnd.apple.pkpass)
//   · google → devuelve { saveUrl } para abrir en el navegador
//
// SECRETS (Supabase → Edge Functions):
//   Comunes:
//     PUBLIC_SITE_URL            p. ej. https://www.neuromundi.com  (para iconos/enlaces)
//   Apple Wallet:
//     APPLE_TEAM_ID              Team ID de tu cuenta de desarrollador
//     APPLE_PASS_TYPE_ID         pass.com.neuromundi.id  (Pass Type ID registrado)
//     APPLE_PASS_CERT            certificado del Pass Type ID en PEM
//     APPLE_PASS_KEY             clave privada del certificado en PEM (sin passphrase)
//     APPLE_WWDR_CERT            certificado WWDR de Apple en PEM
//   Google Wallet:
//     GOOGLE_WALLET_ISSUER_ID    ID de emisor de tu cuenta de Google Wallet
//     GOOGLE_WALLET_CLASS_ID     ID de la clase genérica ya creada (issuerId.claseXYZ)
//     GOOGLE_WALLET_SA_EMAIL     email de la cuenta de servicio
//     GOOGLE_WALLET_SA_KEY       clave privada (PEM) de la cuenta de servicio
//
// Despliegue:  supabase functions deploy wallet-pass --use-api
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import forge from 'https://esm.sh/node-forge@1.3.1';
import { zipSync, strToU8 } from 'https://esm.sh/fflate@0.8.2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const SITE = Deno.env.get('PUBLIC_SITE_URL') ?? 'https://www.neuromundi.com';

/** Devuelve la lista de secrets que faltan para una plataforma (o [] si ok). */
function missing(keys: string[]): string[] {
  return keys.filter((k) => !Deno.env.get(k));
}

function folio(memberNo: number | null): string {
  return memberNo != null ? `NM-${String(memberNo).padStart(6, '0')}` : '—';
}
function roleLabel(role: string): string {
  if (role === 'provider') return 'Especialista Neuromundi';
  if (role === 'parent') return 'Familia Neuromundi';
  return 'Miembro Neuromundi';
}

// ── Perfil del usuario autenticado ─────────────────────────────────────────
async function getProfile(authHeader: string) {
  const client = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data: userRes } = await client.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) return null;
  const { data } = await client
    .from('profiles')
    .select('id, full_name, business_name, role, member_no, qr_token')
    .eq('id', uid)
    .maybeSingle();
  return data ?? null;
}

// ── APPLE WALLET (.pkpass) ─────────────────────────────────────────────────
function applePassJson(p: any): string {
  const qrMessage = JSON.stringify({ parentId: p.id, qrToken: p.qr_token });
  const name = (p.business_name?.trim() || p.full_name || 'Miembro Neuromundi') as string;
  return JSON.stringify({
    formatVersion: 1,
    passTypeIdentifier: Deno.env.get('APPLE_PASS_TYPE_ID'),
    teamIdentifier: Deno.env.get('APPLE_TEAM_ID'),
    organizationName: 'Neuromundi',
    description: 'Neuromundi ID',
    serialNumber: p.id,
    logoText: 'Neuromundi ID',
    foregroundColor: 'rgb(255,255,255)',
    backgroundColor: 'rgb(2,132,199)',
    labelColor: 'rgb(226,240,253)',
    barcodes: [{ format: 'PKBarcodeFormatQR', message: qrMessage, messageEncoding: 'iso-8859-1' }],
    storeCard: {
      primaryFields: [{ key: 'name', label: roleLabel(p.role), value: name }],
      secondaryFields: [{ key: 'folio', label: 'Folio', value: folio(p.member_no) }],
      backFields: [
        { key: 'dir', label: 'Directorio', value: `${SITE}/directorio` },
        { key: 'red', label: 'Red Neuromundi', value: `${SITE}/red` },
        { key: 'how', label: 'Uso', value: 'Muestra este pase al prestador; escanea el QR para validar y aplicar tu beneficio.' },
      ],
    },
  });
}

async function fetchBytes(url: string): Promise<Uint8Array | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return new Uint8Array(await r.arrayBuffer());
  } catch {
    return null;
  }
}

function sha1Hex(bytes: Uint8Array): string {
  const md = forge.md.sha1.create();
  md.update(forge.util.binary.raw.encode(bytes));
  return md.digest().toHex();
}

/** Firma PKCS#7 detached del manifest con el Pass Type ID + WWDR (DER). */
function signManifest(manifest: string): Uint8Array {
  const certPem = Deno.env.get('APPLE_PASS_CERT')!;
  const keyPem = Deno.env.get('APPLE_PASS_KEY')!;
  const wwdrPem = Deno.env.get('APPLE_WWDR_CERT')!;
  const cert = forge.pki.certificateFromPem(certPem);
  const key = forge.pki.privateKeyFromPem(keyPem);
  const wwdr = forge.pki.certificateFromPem(wwdrPem);
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(manifest, 'utf8');
  p7.addCertificate(cert);
  p7.addCertificate(wwdr);
  p7.addSigner({
    key,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date().toISOString() },
    ],
  });
  p7.sign({ detached: true });
  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return forge.util.binary.raw.decode(der);
}

async function buildApplePkpass(p: any): Promise<Uint8Array> {
  const passJson = applePassJson(p);
  // Iconos requeridos por Apple: se toman de los assets públicos del sitio.
  const icon = (await fetchBytes(`${SITE}/favicon-32.png`)) ?? new Uint8Array();
  const logo = (await fetchBytes(`${SITE}/apple-touch-icon.png`)) ?? icon;

  const files: Record<string, Uint8Array> = {
    'pass.json': strToU8(passJson),
    'icon.png': icon,
    'icon@2x.png': logo,
    'logo.png': logo,
  };
  // manifest.json = sha1 de cada archivo.
  const manifest: Record<string, string> = {};
  for (const [name, bytes] of Object.entries(files)) manifest[name] = sha1Hex(bytes);
  const manifestStr = JSON.stringify(manifest);
  files['manifest.json'] = strToU8(manifestStr);
  files['signature'] = signManifest(manifestStr);

  return zipSync(files);
}

// ── GOOGLE WALLET (JWT "Save to Google Wallet") ────────────────────────────
function b64url(bytes: Uint8Array | string): string {
  const raw = typeof bytes === 'string' ? bytes : forge.util.binary.raw.encode(bytes);
  return forge.util.encode64(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function googleSaveUrl(p: any): string {
  const issuer = Deno.env.get('GOOGLE_WALLET_ISSUER_ID')!;
  const classId = Deno.env.get('GOOGLE_WALLET_CLASS_ID')!;
  const saEmail = Deno.env.get('GOOGLE_WALLET_SA_EMAIL')!;
  const saKey = forge.pki.privateKeyFromPem(Deno.env.get('GOOGLE_WALLET_SA_KEY')!);
  const name = (p.business_name?.trim() || p.full_name || 'Miembro Neuromundi') as string;

  const object = {
    id: `${issuer}.${p.id}`,
    classId,
    state: 'ACTIVE',
    genericType: 'GENERIC_TYPE_UNSPECIFIED',
    cardTitle: { defaultValue: { language: 'es', value: 'Neuromundi ID' } },
    header: { defaultValue: { language: 'es', value: name } },
    subheader: { defaultValue: { language: 'es', value: roleLabel(p.role) } },
    textModulesData: [{ id: 'folio', header: 'Folio', body: folio(p.member_no) }],
    barcode: { type: 'QR_CODE', value: JSON.stringify({ parentId: p.id, qrToken: p.qr_token }) },
    hexBackgroundColor: '#0284c7',
  };

  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: saEmail,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    payload: { genericObjects: [object] },
    origins: [SITE],
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const md = forge.md.sha256.create();
  md.update(signingInput, 'utf8');
  const sig = saKey.sign(md); // binary string
  const jwt = `${signingInput}.${b64url(sig)}`;
  return `https://pay.google.com/gp/v/save/${jwt}`;
}

// ── Handler ─────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return json({ error: 'no-auth' }, 401);

  const body = await req.json().catch(() => ({}));
  const platform = (body?.platform as string) ?? '';

  const profile = await getProfile(authHeader);
  if (!profile) return json({ error: 'no-profile' }, 401);

  try {
    if (platform === 'apple') {
      const miss = missing(['APPLE_TEAM_ID', 'APPLE_PASS_TYPE_ID', 'APPLE_PASS_CERT', 'APPLE_PASS_KEY', 'APPLE_WWDR_CERT']);
      if (miss.length) return json({ error: 'not-configured', platform: 'apple', missing: miss }, 501);
      const pkpass = await buildApplePkpass(profile);
      return new Response(pkpass, {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/vnd.apple.pkpass', 'Content-Disposition': 'attachment; filename="neuromundi-id.pkpass"' },
      });
    }
    if (platform === 'google') {
      const miss = missing(['GOOGLE_WALLET_ISSUER_ID', 'GOOGLE_WALLET_CLASS_ID', 'GOOGLE_WALLET_SA_EMAIL', 'GOOGLE_WALLET_SA_KEY']);
      if (miss.length) return json({ error: 'not-configured', platform: 'google', missing: miss }, 501);
      return json({ saveUrl: googleSaveUrl(profile) });
    }
    return json({ error: 'bad-platform', hint: "platform must be 'apple' or 'google'" }, 400);
  } catch (e) {
    return json({ error: 'pass-failed', detail: String(e && (e as Error).message ? (e as Error).message : e) }, 500);
  }
});
