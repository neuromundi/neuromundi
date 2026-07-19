/**
 * crypto — cifrado de extremo a extremo para el intercambio de archivos (Fase 5).
 *
 * Diseño (envelope encryption):
 *  - Cada usuario tiene un par RSA-OAEP. La pública se publica en su perfil; la
 *    privada vive SOLO en su dispositivo (IndexedDB) y nunca sale al servidor.
 *  - Para compartir un archivo: se genera una llave AES-GCM aleatoria, se cifra
 *    el archivo, y esa llave AES se "envuelve" con la pública de cada destinatario.
 *  - El servidor solo almacena el cifrado + las llaves envueltas; jamás el
 *    contenido ni la llave AES en claro.
 *
 * Compromiso: si el usuario borra IndexedDB pierde su privada (y el acceso a lo
 * recibido). Se ofrece exportar la llave como respaldo; NO hay recuperación en
 * servidor (rompería el E2E).
 */
import { idbGet, idbSet } from './idb';

const KEY_STORE = 'e2e-private-key';
const PUB_STORE = 'e2e-public-key';

const b64 = {
  enc: (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))),
  dec: (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)).buffer,
};

const RSA = { name: 'RSA-OAEP', hash: 'SHA-256' } as const;

async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Garantiza que exista un par de llaves local. Devuelve la pública en base64
 * (SPKI) para guardarla en el perfil. Si ya existía, la reutiliza.
 */
export async function ensureKeyPair(): Promise<{ publicKeyB64: string }> {
  let priv = await idbGet<JsonWebKey>(KEY_STORE);
  let pub = await idbGet<string>(PUB_STORE);

  if (!priv || !pub) {
    const pair = await generateKeyPair();
    const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
    const spki = await crypto.subtle.exportKey('spki', pair.publicKey);
    pub = b64.enc(spki);
    await idbSet(KEY_STORE, jwk);
    await idbSet(PUB_STORE, pub);
    priv = jwk;
  }
  return { publicKeyB64: pub };
}

async function loadPrivateKey(): Promise<CryptoKey> {
  const jwk = await idbGet<JsonWebKey>(KEY_STORE);
  if (!jwk) throw new Error('No hay llave privada en este dispositivo.');
  return crypto.subtle.importKey('jwk', jwk, RSA, false, ['decrypt']);
}

async function importPublicKey(spkiB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('spki', b64.dec(spkiB64), RSA, false, ['encrypt']);
}

export interface EncryptedFile {
  ciphertext: Blob;
  ivB64: string;
  wrapped: { recipientId: string; wrappedKeyB64: string }[];
}

/** Cifra un archivo para una lista de destinatarios (cada uno con su pública). */
export async function encryptForRecipients(
  file: File,
  recipients: { id: string; publicKeyB64: string }[],
): Promise<EncryptedFile> {
  const aesKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await file.arrayBuffer();
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, data);
  const rawAes = await crypto.subtle.exportKey('raw', aesKey);

  const wrapped = await Promise.all(
    recipients.map(async (r) => {
      const pub = await importPublicKey(r.publicKeyB64);
      const w = await crypto.subtle.encrypt(RSA, pub, rawAes);
      return { recipientId: r.id, wrappedKeyB64: b64.enc(w) };
    }),
  );

  return { ciphertext: new Blob([ct]), ivB64: b64.enc(iv.buffer), wrapped };
}

/** Descifra un archivo recibido usando la llave privada local. */
export async function decryptFile(ciphertext: ArrayBuffer, wrappedKeyB64: string, ivB64: string): Promise<ArrayBuffer> {
  const priv = await loadPrivateKey();
  const rawAes = await crypto.subtle.decrypt(RSA, priv, b64.dec(wrappedKeyB64));
  const aesKey = await crypto.subtle.importKey('raw', rawAes, { name: 'AES-GCM' }, false, ['decrypt']);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(b64.dec(ivB64)) }, aesKey, ciphertext);
}

/** Exporta la llave privada (JWK) como respaldo descargable por el usuario. */
export async function exportPrivateKeyBackup(): Promise<Blob> {
  const jwk = await idbGet<JsonWebKey>(KEY_STORE);
  if (!jwk) throw new Error('No hay llave privada que exportar.');
  return new Blob([JSON.stringify(jwk)], { type: 'application/json' });
}

/** Restaura la llave privada desde un respaldo (JWK). */
export async function importPrivateKeyBackup(jwk: JsonWebKey, publicKeyB64: string): Promise<void> {
  await idbSet(KEY_STORE, jwk);
  await idbSet(PUB_STORE, publicKeyB64);
}
