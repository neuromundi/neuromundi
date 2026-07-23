# Neuromundi — Puesta en producción

> Checklist de lo que falta **de tu lado** para que la plataforma quede lista.
> El orden importa: base de datos → correo → pagos → secretos → funciones →
> frontend → datos de negocio → pruebas. Marca cada casilla al completarla.
>
> Convención: 🔴 bloquea el lanzamiento · 🟡 conviene antes de cobrar · ⚪ opcional.

---

## 0) Dónde está cada cosa

| Pieza | Dónde vive | Quién la toca |
|---|---|---|
| Base de datos, Auth, Storage, Edge Functions | Supabase | tú (SQL Editor + CLI) |
| Cobros y suscripciones | Stripe | tú (Dashboard) |
| Correo transaccional | Resend | tú (DNS + API key) |
| SMS / WhatsApp | Twilio | tú (opcional) |
| Sitio web (`dist/`) | **Hostinger** (Apache) | tú (subida + purgar CDN) |
| Analítica | Google (tag `G-10RD9TJY3V`) | ya instalado |

El hosting es Hostinger, no Netlify ni Vercel. Se comprueba con
`curl.exe -sI https://www.neuromundi.com` → cabecera `Server: hcdn`. Los archivos
`netlify.toml`, `vercel.json` y `public/_redirects` son restos sin efecto; el que
manda es **`public/.htaccess`**, que debe quedar en `public_html/` junto al
`index.html`.

---

## 1) 🔴 Base de datos — migraciones al día

En el repo van de `0001` a **`0048`**. Se aplican **a mano, en orden**, en
Supabase → SQL Editor. Son idempotentes: si dudas de alguna, la puedes reejecutar
sin romper nada.

1. [ ] Aplica todo lo que falte hasta `0047_donation_tiers.sql`.
   Las últimas y por qué importan:

   | # | Qué hace | Si falta… |
   |---|---|---|
   | 0038 | Estructura de cuotas mensual/anual × fundador/ordinaria | el checkout no encuentra precio |
   | 0039 | Clasifica profesión médica / no médica | todos pagan como no médicos |
   | 0040 | `my_membership_options` | el selector mensual/anual sale vacío |
   | **0041** | `normalize_country()` + deduplica países | **México sale duplicado en el selector** |
   | 0042 | Importar/exportar cuotas por CSV | los botones de CSV dan error |
   | 0043 | Libro de comisiones de afiliados | el panel de comisiones sale vacío |
   | 0044 | Arregla `my_badge_inputs` | el distintivo del prestador da 400 en consola |
   | 0045 | Donaciones (`donations` + muro) | la página /donar no puede registrar donativos |
   | 0046 | Donaciones etapa 2 (`allies` + admin) | el muro, el carrusel y el panel de donaciones fallan |
   | 0047 | `donation_tiers` (importes por moneda) | la página de donación no encuentra los importes |
   | 0048 | `search_members` (búsqueda admin en mensajería) | el admin no puede buscar por nombre al escribir |

2. [ ] Comprueba qué quedó aplicado con `db/verificar_produccion.sql`.
3. [ ] Si México sigue duplicado en Cuotas, es que **0041 no corrió**. Verifica con:
   ```sql
   select country_label, count(*) from public.membership_prices
   group by 1 having count(*) > 1;
   ```
4. [ ] Extensiones activas: **pg_cron** y **pg_net** (Database → Extensions).
   Si el `create extension` falló por permisos, actívalas ahí y reejecuta el
   bloque `do $$ … $$` de las migraciones `0021` y `0028`.
5. [ ] Buckets de Storage, todos **privados**: `avatars`, `reports`, `secure`, `verification`.
6. [ ] Tu usuario es admin: `update public.profiles set role='admin' where id='<tu-uuid>';`

---

## 2) 🔴 Resend — correo transaccional

Cuatro funciones mandan correo y **todas fallan en silencio si falta la API key**:
`send-support`, `send-reminders`, `send-campaign` y `send-product-rejection`.
Cuando `RESEND_API_KEY` está vacía, el envío se marca `skipped` y no se avisa a
nadie: los recordatorios de cita y las campañas simplemente no salen.

**Pasos:**

1. [ ] Crea la cuenta en [resend.com](https://resend.com) (el plan gratuito da
   3,000 correos/mes, suficiente para arrancar).
2. [ ] **Domains → Add Domain** → `neuromundi.com`. Resend te mostrará los
   registros DNS exactos que hay que crear (uno SPF de tipo TXT, dos o tres de
   DKIM, y opcionalmente DMARC).
3. [ ] Cópialos en **Hostinger → hPanel → Dominios → Zona DNS**. Ojo con dos
   detalles que suelen morder: Hostinger a veces añade el dominio solo al final
   del nombre (si el registro queda como `resend._domainkey.neuromundi.com.neuromundi.com`
   está mal), y la propagación puede tardar hasta una hora.
4. [ ] Vuelve a Resend y pulsa **Verify**. No sigas hasta que el dominio salga
   en verde: con el dominio sin verificar, Resend solo deja enviar a tu propia
   dirección y todo lo demás se rechaza.
5. [ ] **API Keys → Create API Key**, permiso *Sending access*. Cópiala (`re_…`);
   solo se muestra una vez.
6. [ ] Decide los remitentes. El código usa `SUPPORT_FROM` como remitente único,
   con estos valores por defecto según la función: `avisos@`, `recordatorios@`,
   `soporte@` y `admin@`. Lo más simple es fijar uno solo:
   ```
   supabase secrets set RESEND_API_KEY=re_xxxxxxxx
   supabase secrets set SUPPORT_FROM="Neuromundi <no-reply@neuromundi.com>"
   supabase secrets set SUPPORT_TO=admin@neuromundi.com
   ```
   El buzón de `SUPPORT_FROM` no necesita existir como cuenta de correo, pero el
   **dominio sí tiene que ser el verificado**.
7. [ ] Redespliega las cuatro funciones (paso 6) — los secretos se leen al arrancar.
8. [ ] Prueba: envía un mensaje desde el botón de soporte del sitio y revisa
   **Resend → Logs**. Si aparece ahí, el circuito funciona.

🟡 **Aparte, y es distinto:** los correos de *confirmación de cuenta y
recuperación de contraseña* no los manda Resend desde tu código, los manda
Supabase Auth con su SMTP de cortesía, que está limitado y cae en spam. Configura
tu propio SMTP en **Authentication → Emails → SMTP Settings**; Resend sirve
también para esto:

```
Host: smtp.resend.com     Puerto: 465 (SSL) o 587 (TLS)
Usuario: resend           Contraseña: tu API key (re_…)
Sender: no-reply@neuromundi.com
```

---

## 3) 🔴 Stripe en modo real

1. [ ] **Activa la cuenta**: perfil del negocio, datos fiscales y cuenta bancaria.
   Hasta activarla no puedes cobrar en real.
2. [ ] Habilita **Connect → Express** (Dashboard → Connect). Es lo que permite que
   cada prestador reciba sus pagos de productos y consultas.
3. [ ] Cambia el switch a **Live** y copia la clave secreta `sk_live_…`.
   **Tiene que empezar con `sk_`**, no con `pk_`: la pública no sirve, y el error
   que da es confuso. El frontend no usa ninguna clave de Stripe.
4. [ ] Prueba antes en **modo test** las cuatro combinaciones (fundador/ordinaria ×
   mensual/anual) y confirma que el importe cobrado coincide con la tabla de cuotas.
5. [ ] El webhook va en el paso 7, cuando ya tengas la URL de la función.

> Cómo está programado el dinero: **membresías** las cobra la plataforma;
> **productos y consultas** los cobra íntegros el prestador vía Connect
> (`transfer_data.destination`), **sin `application_fee`**: Neuromundi no retiene
> nada. Si un producto se vendió con código de promotor, la comisión se registra
> en el libro (migración 0043) y la paga el vendedor por su cuenta.

---

## 4) 🔴 Push nativo (VAPID)

1. [ ] **Regenera el par de claves.** La clave privada que tenías se compartió en
   un chat, y una clave privada expuesta es como una contraseña filtrada: hay que
   rotarla, no confiar en que nadie la vio.
   ```
   npx web-push generate-vapid-keys
   ```
2. [ ] La **pública** va en dos sitios y deben ser idénticas: `VITE_VAPID_PUBLIC_KEY`
   en tu `.env` y `VAPID_PUBLIC_KEY` como secret.
3. [ ] La **privada** va SOLO como secret. Nunca en el `.env` del front, nunca en git.
4. [ ] Después de rotar, las suscripciones viejas quedan inservibles:
   `delete from public.push_subscriptions;` y que la gente vuelva a activar el aviso.
5. [ ] Tras compilar, verifica que el push no se haya eliminado como código muerto:
   ```
   grep -l pushManager dist/assets/*.js
   ```
   Si no devuelve nada, faltaba `VITE_VAPID_PUBLIC_KEY` al compilar. Vite sustituye
   las `VITE_*` ausentes por `undefined` y el minificador **borra el bloque entero**
   sin avisar.
6. [ ] En iPhone el push solo llega si la PWA está **instalada en la pantalla de
   inicio** (iOS 16.4+). Es limitación de Apple, no del código.

---

## 5) ⚪ Twilio (SMS y WhatsApp de campañas)

Solo si vas a usar el canal SMS/WhatsApp de las campañas. Si no configuras estos
secretos, las campañas salen igual por push y correo, y el SMS se marca `skipped`.

```
supabase secrets set TWILIO_ACCOUNT_SID=ACxxx
supabase secrets set TWILIO_AUTH_TOKEN=xxx
supabase secrets set TWILIO_SMS_FROM=+1xxxxxxxxxx
supabase secrets set TWILIO_WHATSAPP_FROM=whatsapp:+1xxxxxxxxxx
```

WhatsApp exige además plantillas aprobadas por Meta para escribir primero a alguien.

---

## 6) 🔴 Secretos y despliegue de las Edge Functions

**Todos los secretos, de una vez:**

```
supabase link --project-ref sboagswcehuxwfjdbhdn
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx      # del paso 7
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set SUPPORT_FROM="Neuromundi <no-reply@neuromundi.com>"
supabase secrets set SUPPORT_TO=admin@neuromundi.com
supabase secrets set VAPID_PUBLIC_KEY=xxx
supabase secrets set VAPID_PRIVATE_KEY=xxx
supabase secrets set VAPID_SUBJECT=mailto:admin@neuromundi.com
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` las inyecta
Supabase sola: **no las configures a mano**.

**Despliegue.** Usa `--use-api` para no depender de Docker. El nombre debe
coincidir EXACTO con la carpeta.

```
supabase functions deploy create-membership-checkout   --use-api
supabase functions deploy create-product-checkout      --use-api
supabase functions deploy create-consultation-checkout --use-api
supabase functions deploy create-donation-checkout     --use-api
supabase functions deploy connect-onboarding           --use-api
supabase functions deploy send-support                 --use-api
supabase functions deploy send-campaign                --use-api
supabase functions deploy send-product-rejection       --use-api
supabase functions deploy delete-account               --use-api
```

🔴 **Estas cuatro llevan `--no-verify-jwt`**, porque no las invoca un usuario con
sesión sino Stripe, la propia base de datos o el cron, y ninguno manda cabecera
`Authorization`:

```
supabase functions deploy stripe-webhook        --use-api --no-verify-jwt
supabase functions deploy send-push             --use-api --no-verify-jwt
supabase functions deploy send-reminders        --use-api --no-verify-jwt
supabase functions deploy purge-expired-files   --use-api --no-verify-jwt
```

Si las despliegas sin ese flag responden **401 y el fallo es invisible**: el
trigger `tg_notify_push` se traga la excepción a propósito para no bloquear la
notificación in-app, así que la campana funciona y el push nunca llega. Compruébalo
en **Edge Functions → Logs**.

---

## 7) 🔴 Webhook de Stripe

1. [ ] URL: `https://sboagswcehuxwfjdbhdn.supabase.co/functions/v1/stripe-webhook`
2. [ ] Stripe (modo **Live**) → Developers → Webhooks → Add endpoint → pega la URL.
3. [ ] Suscribe estos eventos:
   `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`,
   `account.updated`, `charge.refunded`.
4. [ ] Copia el **Signing secret** (`whsec_…`), guárdalo como secret y **redespliega**
   `stripe-webhook`.
5. [ ] El `whsec` debe ser del webhook **del mismo modo** que la `sk`: mezclar test
   con live da errores de firma difíciles de leer.

---

## 8) 🟡 Tareas automáticas (cron)

- [ ] **Recordatorios de cita**: los programa `pg_cron` en las migraciones `0021` y
  `0028` (cada 10 min). Verifica que quedaron:
  ```sql
  select jobname, schedule, active from cron.job;
  ```
- [ ] **purge-expired-files**: prográmala tú, no viene en ninguna migración.
  ```sql
  select cron.schedule('nm-purge-files','0 3 * * *', $$
    select net.http_post(
      url := 'https://sboagswcehuxwfjdbhdn.supabase.co/functions/v1/purge-expired-files',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := '{}'::jsonb);
  $$);
  ```
- [ ] ⚪ **Insignias de prestador** a diario, si las vas a usar:
  `select cron.schedule('refresh-badges-daily','0 6 * * *', $$ select public.refresh_all_badges(); $$);`
- [ ] Si tu plan no tiene `pg_net`, usa un cron externo (cron-job.org) que haga POST
  a esas mismas URLs.

---

## 9) 🔴 Frontend: compilar y publicar

1. [ ] `.env` completo antes de compilar (las `VITE_*` se incrustan **en tiempo de
   build**; lo que falte se vuelve `undefined` y su código desaparece):
   ```
   VITE_SUPABASE_URL=https://sboagswcehuxwfjdbhdn.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi…
   VITE_VAPID_PUBLIC_KEY=…
   VITE_APP_NAME=Neuromundi
   VITE_APP_VERSION=1.0.0
   ```
2. [ ] `npm run test` y `npm run build` en verde. El build es la verificación
   definitiva de tipos.
3. [ ] Comprobaciones sobre el `dist/` ya compilado:
   - `grep -l pushManager dist/assets/*.js` → debe encontrar algo.
   - `grep modulepreload dist/index.html` → debe aparecer el mapa de idiomas.
4. [ ] Sube el contenido de `dist/` a `public_html/` en Hostinger, **incluido
   `.htaccess`** (es un archivo oculto: activa "mostrar archivos ocultos" en el
   administrador de archivos o se queda fuera sin avisar).
5. [ ] **Purga la caché del CDN** en hPanel. Sin esto, los archivos con nombre
   estable (video, imágenes del héroe) siguen sirviéndose viejos aunque los subas.
6. [ ] Verifica HTTPS válido en `www.neuromundi.com`. La PWA y el service worker
   **solo funcionan por HTTPS** en el dominio real.
7. [ ] Comprueba que las rutas del cliente cargan directo (entra a
   `www.neuromundi.com/directorio` escribiéndolo en la barra, no navegando).

---

## 10) 🔴 Auth de Supabase

1. [ ] Authentication → URL Configuration:
   - **Site URL**: `https://www.neuromundi.com`
   - **Redirect URLs**: `https://www.neuromundi.com/**`
2. [ ] Deja **Confirm email** activado.
3. [ ] SMTP propio configurado (paso 2).
4. [ ] Revisa las plantillas de confirmación y recuperación, y su idioma.

---

## 11) 🔴 Datos de negocio que solo tú puedes cargar

El código está listo pero **la base arranca casi vacía de precios**. Sin esto, el
checkout no sabe cuánto cobrar.

1. [ ] `/panel` → **Cuotas**. Sembrado viene solo **México, especialistas médicos**:
   fundador 1,000/10,000 (ref. 12,000) y ordinaria 1,500/15,000 (ref. 18,000) MXN.
2. [ ] Captura el resto de tipos de afiliado (no médicos, prestadores de servicios,
   proveedores, escuelas, clínicas) y los demás países. Lo más rápido: **descarga el
   CSV, edítalo en Excel y súbelo**. El formato es:
   ```
   pais;tipo;clase;moneda;mensual;anual;anual_referencia;sin_centavos
   México;medical_specialist;founder;MXN;1000;10000;12000;no
   ```
   Si dejas `anual` y `anual_referencia` vacíos se calculan solos (×10 y ×12).
3. [ ] `/panel` → **Afiliados**: revisa el % de descuento (5% por defecto), el paso y
   tope de recompensa del referente, y los días de vigencia del enlace (7).
4. [ ] ⚪ Contenido de arranque: entradas del blog, eventos, cursos de Academy y
   productos destacados. Un directorio vacío es la primera impresión.

---

## 12) 🟡 SEO y analítica

- [ ] Da de alta el sitio en **Google Search Console** y verifica la propiedad.
- [ ] Envía `https://www.neuromundi.com/sitemap.xml`.
- [ ] Confirma que la etiqueta `G-10RD9TJY3V` recibe datos (Google Analytics →
  Tiempo real). Se carga **4 segundos después** del load a propósito, para no
  competir con la medición de rendimiento; si pruebas con el bloqueador de anuncios
  activo no verás nada.
- [ ] Revisa `public/robots.txt` y que no quede ningún `noindex` de pruebas.

---

## 13) 🔴 Pruebas de humo en producción

Recorrido real, con importe mínimo y luego reembolso:

- [ ] Registro de familia/paciente → llega el correo → confirma → entra.
- [ ] Registro de prestador → conecta Stripe (Connect) → queda habilitado.
- [ ] **Membresía**: elegir mensual y anual → pagar → el webhook marca la cuota
  como pagada → el panel se **reactiva solo** con el mensaje de agradecimiento.
- [ ] **Cuota impagada**: comprueba que el panel se apaga y sale el popup cordial.
- [ ] **Producto**: comprar → el prestador recibe con comisión → orden en `paid`.
- [ ] **Cita**: solicitud → aceptación → aparece en el calendario → recordatorio
  a las 24 h (correo **y** push).
- [ ] **Recomendación**: abre tu enlace `?ref=` en una ventana privada, regístrate
  y confirma que aparece en `/panel` → Afiliados con el descuento aplicado.
- [ ] **Comisión de promoción**: compra un producto con el enlace de afiliado de otro
  miembro y confirma tres cosas: que el **vendedor recibe el importe íntegro** en
  Stripe (ya no hay `application_fee`), que la comisión aparece como "por pagar" en
  el panel de comisiones, y que al marcarla como pagada le llega el aviso al promotor.
- [ ] **Reembolso**: reembolsa esa compra en Stripe y comprueba que el pedido pasa a
  `refunded` y la comisión a "revertida". Requiere que el webhook tenga suscrito
  `charge.refunded`.
- [ ] **Denuncia** (miembro y externo) → llega al panel admin.
- [ ] **PWA**: instalar en Android/escritorio y en iPhone (Safari → Compartir →
  Añadir a inicio), y que llegue un push a cada uno.
- [ ] Revisa **Logs** de las Edge Functions y el historial del webhook: todo en 200.

---

## 14) 🟡 Legal y operativo

- [ ] Aviso de Privacidad, Términos y política de **reembolsos y cancelaciones**
  publicados y vigentes (las páginas existen; falta que el contenido esté revisado).
- [ ] Facturación e impuestos según tu país (los campos fiscales ya existen en el registro).
- [ ] Datos de contacto y soporte visibles.
- [ ] Repositorio de GitHub en **privado**, y `.env` fuera del control de versiones.

---

## 15) 🟡 Monitoreo y respaldos

- [ ] Alertas de fallo de webhook en Stripe.
- [ ] Respaldos automáticos de la base (Supabase → Database → Backups).
- [ ] Revisión periódica de Logs de funciones y errores de Auth.

---

## Limpieza pendiente en la raíz

Archivos que ya no hacen falta y que el entorno de trabajo no puede borrar
(hay que hacerlo desde Windows):

- `public/hero/hero-*-v1.webp` (5 archivos) — sustituidos por `-v2`
- `NEUROMUNDI LOGO HEADER.png` — ya está como `public/logo-header.png`
- `456`, `tsconfig.tsbuildinfo` — basura de compilación
- `netlify.toml`, `vercel.json`, `public/_redirects`, `public/_headers` — sin
  efecto en Hostinger. **Conserva `public/.htaccess`.**

---

### Resumen de qué toca a quién

- **Supabase**: migraciones 0001–0042, pg_cron + pg_net, buckets, Auth (Site URL +
  SMTP), secrets, deploy de funciones (cuatro con `--no-verify-jwt`).
- **Resend**: dominio verificado por DNS en Hostinger, API key, remitente.
- **Stripe (Live)**: cuenta activa, Connect Express, `sk_live`, webhook + `whsec`.
- **Hostinger**: subir `dist/` + `.htaccess`, purgar CDN, HTTPS.
- **Tú, en el panel**: cuotas por país y tipo, programa de recomendación, contenido.
- **Operación**: pruebas de humo, legal, monitoreo.
