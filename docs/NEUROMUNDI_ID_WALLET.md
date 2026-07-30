# Neuromundi ID — Wallet (Fase 3)

Andamiaje listo para **Apple Wallet** (`.pkpass` firmado) y **Google Wallet**
(enlace "Guardar" con JWT firmado). El código ya existe en la Edge Function
`supabase/functions/wallet-pass/index.ts`; **solo falta conseguir las credenciales
y ponerlas como secrets**. Mientras no estén, la función responde `501
not-configured` con la lista exacta de lo que falta, y en el front los botones
"Añadir a Wallet" **no se muestran** (quedan detrás de `VITE_WALLET_ENABLED`).

---

## 1) Qué hace la función `wallet-pass`

Se invoca con sesión: `supabase.functions.invoke('wallet-pass', { body: { platform: 'apple' | 'google' } })`.

- `platform: 'google'` → devuelve `{ saveUrl }` (una URL `https://pay.google.com/gp/v/save/<jwt>`), que el front abre. **Este flujo funciona en cuanto pongas los secrets de Google.**
- `platform: 'apple'` → devuelve el binario `.pkpass` (firmado) que el navegador descarga. Requiere los certificados de Apple.

La función lee el perfil del usuario autenticado (nombre, rol, folio `NM-`, `qr_token`) y arma el pase con el QR de descuentos y el enlace al directorio.

---

## 2) Credenciales a conseguir

### Apple Wallet
1. **Cuenta de Apple Developer** (de pago).
2. En *Certificates, Identifiers & Profiles* → **Identifiers** → crea un **Pass Type ID** (ej. `pass.com.neuromundi.id`).
3. Genera el **certificado del Pass Type ID** (subes un CSR, descargas el `.cer`). Conviértelo a PEM:
   ```
   openssl x509 -inform der -in pass.cer -out pass_cert.pem
   # la clave privada (del CSR) exportada sin passphrase:
   openssl pkcs12 -in Certificates.p12 -nocerts -nodes -out pass_key.pem
   ```
4. Descarga el **Apple WWDR** (Worldwide Developer Relations) intermedio y pásalo a PEM:
   ```
   openssl x509 -inform der -in AppleWWDRCAG3.cer -out wwdr.pem
   ```
5. Anota tu **Team ID** (esquina superior derecha de la cuenta).

### Google Wallet
1. Solicita/activa la **Google Wallet API** y una **cuenta de emisor** (Issuer) en la Google Pay & Wallet Console. Anota el **Issuer ID**.
2. Crea una **clase genérica** (Generic pass class) — desde la consola o la API — y anota su **id** (`<ISSUER_ID>.neuromundi_id` o el que definas).
3. En Google Cloud, crea una **cuenta de servicio**, dale permiso de emisor de Wallet, y descarga su **clave privada (JSON)**. De ahí saca:
   - `client_email` → `GOOGLE_WALLET_SA_EMAIL`
   - `private_key` (PEM, con `-----BEGIN PRIVATE KEY-----`) → `GOOGLE_WALLET_SA_KEY`

---

## 3) Secrets a poner en Supabase

```
supabase secrets set PUBLIC_SITE_URL="https://www.neuromundi.com"

# Apple
supabase secrets set APPLE_TEAM_ID="XXXXXXXXXX"
supabase secrets set APPLE_PASS_TYPE_ID="pass.com.neuromundi.id"
supabase secrets set APPLE_PASS_CERT="$(cat pass_cert.pem)"
supabase secrets set APPLE_PASS_KEY="$(cat pass_key.pem)"
supabase secrets set APPLE_WWDR_CERT="$(cat wwdr.pem)"

# Google
supabase secrets set GOOGLE_WALLET_ISSUER_ID="3388000000022XXXXXX"
supabase secrets set GOOGLE_WALLET_CLASS_ID="3388000000022XXXXXX.neuromundi_id"
supabase secrets set GOOGLE_WALLET_SA_EMAIL="wallet@tu-proyecto.iam.gserviceaccount.com"
supabase secrets set GOOGLE_WALLET_SA_KEY="$(cat sa_private_key.pem)"
```

> Nota PEM multilínea: si `secrets set` te da problemas con saltos de línea,
> usa el panel web de Supabase (Edge Functions → Secrets) y pega el PEM completo.

---

## 4) Desplegar y encender

1. Despliega la función (necesita red para descargar las libs de esm.sh la 1ª vez):
   ```
   supabase functions deploy wallet-pass --use-api
   ```
   (Va **con** verificación de JWT: la invoca un usuario con sesión.)
2. Enciende los botones en el front: en tu `.env` de build,
   ```
   VITE_WALLET_ENABLED=true
   ```
   y recompila (`npm run build`). Sin esta variable, la tarjeta muestra solo el
   texto "Pronto podrás guardarla en Apple/Google Wallet" y no llama a la función.

---

## 5) Verificación

- **Google** (lo más fácil de probar): con los 4 secrets de Google puestos, la
  función debe devolver `{ saveUrl }` 200. Ábrela en un móvil con Google Wallet.
- **Apple**: descarga el `.pkpass` en un iPhone (Safari) y comprueba que abre en
  Wallet. Si Apple rechaza el pase, revisa: iconos presentes (`favicon-32.png` y
  `apple-touch-icon.png` deben existir en `PUBLIC_SITE_URL`), certificado no
  vencido, y que la clave PEM no tenga passphrase.

---

## 6) Puntos de enganche en el código (por si hay que ajustar)

`supabase/functions/wallet-pass/index.ts`:
- `applePassJson()` — estructura del pase Apple (campos, colores, QR).
- `signManifest()` — firma PKCS#7 detached (node-forge). Aquí entran los certs.
- `buildApplePkpass()` — arma el zip `.pkpass` (fflate) con iconos + manifest + firma.
- `googleSaveUrl()` — arma y firma el JWT RS256 (node-forge) y devuelve el enlace.
- `missing()` — decide el 501 con la lista de secrets faltantes.

Front: `src/hooks/useWalletPass.ts` (gate `VITE_WALLET_ENABLED`) y los botones en
`src/components/parent/NeuromundiIdCard.tsx`.
