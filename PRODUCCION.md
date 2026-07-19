# Neuromundi — Paso a paso para producción y pagos reales

> Checklist de puesta en producción. El orden importa: primero base de datos y
> Stripe, luego secretos y funciones, después el frontend y el dominio, y al
> final las pruebas. Marca cada paso al completarlo.

---

## 0) Requisitos previos

- [ ] Cuenta de **Supabase** (proyecto de **producción**, separado del de pruebas).
- [ ] Cuenta de **Stripe** a nombre del negocio (con datos fiscales y cuenta bancaria).
- [ ] Dominio **www.neuromundi.com** con acceso a su DNS.
- [ ] **Supabase CLI** instalado (para desplegar Edge Functions):
  `npm i -g supabase` y `supabase login`.
- [ ] Cuenta en el host del frontend: **Netlify** o **Vercel** (ambos ya están configurados en el repo).

---

## 1) Base de datos (Supabase producción)

1. [ ] Crea el proyecto de producción en Supabase y guarda:
   - **Project URL** (https://TUPROYECTO.supabase.co)
   - **anon key** (pública) y **service_role key** (secreta, NO va al frontend).
2. [ ] Aplica **TODAS las migraciones en orden** (SQL Editor), de `0001` a `0022`:
   `supabase/migrations/0001_...` … `0022_search_patients.sql`.
   Son idempotentes; si dudas de alguna, puedes reejecutarla.
3. [ ] Habilita la extensión **pg_cron** y programa recordatorios (migración `0021_pg_cron.sql`).
   Si el `create extension` falla por permisos: Dashboard → Database → Extensions → activa **pg_cron**, y reejecuta el bloque `do $$ ... $$` de esa migración.
4. [ ] Verifica los **buckets de Storage** (Storage → Buckets). Deben existir y ser **privados**:
   - `avatars`, `reports`, `secure`, `verification` (los crean las migraciones/base; si falta alguno, créalo privado).
5. [ ] Confirma que **RLS está activo** en todas las tablas (las migraciones lo activan).

---

## 2) Stripe en modo real (live)

1. [ ] **Activa tu cuenta** de Stripe (completa el perfil del negocio, datos fiscales y cuenta bancaria de liquidación). Hasta activarla, no puedes cobrar en real.
2. [ ] Habilita **Stripe Connect** → tipo **Express** (Dashboard → Connect). Es lo que permite que cada prestador reciba sus pagos.
3. [ ] Cambia el Dashboard a **modo Live** (switch “Test/Live”) y copia la **clave secreta live**: `sk_live_...`.
   - La app **no usa** clave pública en el frontend (los checkouts se crean del lado servidor), así que solo necesitas la secreta.
4. [ ] Deja pendiente el **webhook** (lo configuras en el paso 5, cuando tengas la URL de la función).

> Modelo de dinero, tal como está programado:
> - **Membresías** → cobra la **plataforma** (tu cuenta Stripe).
> - **Productos** → cobra el **prestador** vía Connect, con **comisión (application_fee)** para la plataforma.
> - **Consultas** → cobra el **prestador** vía Connect (transfer_data.destination).

---

## 3) Secretos de las Edge Functions (Supabase)

Configúralos como **secrets** (no en el `.env` del frontend). Desde la CLI:

```
supabase link --project-ref TU_PROJECT_REF
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx      # lo obtienes en el paso 5
supabase secrets set RESEND_API_KEY=re_xxx                # correos (soporte/notif)
supabase secrets set SUPPORT_FROM="Neuromundi <no-reply@neuromundi.com>"
supabase secrets set SUPPORT_TO=admin@neuromundi.com
# Opcionales (WhatsApp por Twilio), solo si los usarás:
supabase secrets set TWILIO_ACCOUNT_SID=ACxxx
supabase secrets set TWILIO_AUTH_TOKEN=xxx
supabase secrets set TWILIO_WHATSAPP_FROM=whatsapp:+1xxxxxxxxxx
```

> `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` las inyecta
> Supabase automáticamente en las funciones: **no las configures a mano**.

`RESEND_FROM`/`SUPPORT_FROM` debe ser un remitente **verificado** en Resend, con tu dominio.

---

## 4) Desplegar las Edge Functions

```
supabase functions deploy create-membership-checkout
supabase functions deploy create-product-checkout
supabase functions deploy create-consultation-checkout
supabase functions deploy connect-onboarding
supabase functions deploy stripe-webhook
supabase functions deploy send-support
supabase functions deploy send-product-rejection
supabase functions deploy send-reminders
supabase functions deploy purge-expired-files
supabase functions deploy delete-account
```

(Puedes desplegarlas todas de una vez con `supabase functions deploy` si tu CLI lo permite.)

---

## 5) Configurar el webhook de Stripe (live)

1. [ ] Copia la URL pública de tu función:
   `https://TUPROYECTO.supabase.co/functions/v1/stripe-webhook`
2. [ ] Stripe Dashboard (modo **Live**) → Developers → **Webhooks** → **Add endpoint** → pega esa URL.
3. [ ] Suscribe al menos estos eventos:
   - `checkout.session.completed`
   - `invoice.paid` y `invoice.payment_failed` (suscripciones/membresías)
   - `account.updated` (Connect: habilita cobros del prestador)
   - `charge.refunded` (si manejarás reembolsos)
4. [ ] Copia el **Signing secret** (`whsec_...`) y guárdalo con
   `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...` (paso 3), y **redepliega** `stripe-webhook`.

---

## 6) Programar tareas automáticas (cron)

- [ ] **Recordatorios de cita 24 h** → ya quedan con `pg_cron` (migración 0021).
- [ ] **send-reminders** y **purge-expired-files**: prográmalas para que corran periódicamente.
  Opción A (pg_cron + `net.http_post` / `pg_net`) llamando a la URL de cada función.
  Opción B: un cron externo (por ejemplo cron-job.org) que haga POST a
  `https://TUPROYECTO.supabase.co/functions/v1/send-reminders` con el header
  `Authorization: Bearer <ANON_KEY>` según lo que valide la función.

---

## 7) Variables de entorno del frontend

En el host (Netlify/Vercel → Environment variables), define:

```
VITE_SUPABASE_URL=https://TUPROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...   (anon key de producción)
VITE_APP_NAME=Neuromundi
VITE_APP_VERSION=1.0.0
```

No pongas aquí ninguna clave de Stripe ni el service_role.

---

## 8) Desplegar el frontend y el dominio

1. [ ] Conecta el repositorio a **Netlify** o **Vercel** (ya hay `netlify.toml` y `vercel.json`).
   - Build: `npm run build` · Publish/Output: `dist` · Node 20.
2. [ ] Apunta **www.neuromundi.com** al host (DNS) y verifica **HTTPS** (certificado válido).
   - La instalación de la **PWA** y el service worker **solo funcionan por HTTPS** en el dominio real.
3. [ ] Verifica que el sitio carga y que las rutas del cliente funcionan (redirect a `index.html` ya está configurado).

---

## 9) Configurar Auth de Supabase (producción)

1. [ ] Authentication → URL Configuration:
   - **Site URL**: `https://www.neuromundi.com`
   - **Redirect URLs**: agrega `https://www.neuromundi.com/**` (incluye `/ajustes?recovery=1` y `/panel`).
2. [ ] Deja **“Confirm email” activado** (para que el registro exija confirmar el correo).
3. [ ] Configura **SMTP propio** (Auth → Emails → SMTP) para que los correos de confirmación/recuperación no caigan en spam y salgan desde tu dominio.
4. [ ] Revisa las **plantillas** de correo (confirmación, recuperación) y su idioma.

---

## 10) Onboarding de pagos de los prestadores (Connect)

- [ ] Cada prestador que quiera cobrar debe **conectar su cuenta** desde su área (Ajustes → conectar pagos), lo que dispara `connect-onboarding` y lo lleva a Stripe.
- [ ] Solo cuando Stripe habilite sus cobros (`stripe_charges_enabled = true`, vía evento `account.updated`) podrá vender productos/consultas. Verifica este flujo con una cuenta real.

---

## 11) Pruebas de humo en producción

Haz un recorrido real (puedes usar un monto mínimo y luego reembolsar):

- [ ] Registro de familia/paciente → llega correo → confirma → entra.
- [ ] Registro de prestador → conecta Stripe (Connect) → queda habilitado.
- [ ] **Membresía**: iniciar pago → completar en Stripe → el **webhook** marca la cuota como pagada (revisa el estado en el perfil).
- [ ] **Producto**: comprar → pago al prestador con comisión → orden marcada `paid`.
- [ ] **Consulta/cita**: solicitud del especialista → aceptación del paciente → aparece en su calendario → recordatorio 24 h.
- [ ] **Denuncia** (miembro y externo) → llega al panel admin.
- [ ] **Instalar app (PWA)** en Android/escritorio (instala directo) y iPhone (instrucciones Safari).
- [ ] Revisa **Logs** de las Edge Functions y el **historial de eventos** del webhook (todos en 200).

---

## 12) Legal y operativo (antes de cobrar)

- [ ] Aviso de Privacidad, Términos y política de **reembolsos/cancelaciones** publicados y vigentes.
- [ ] Manejo de **impuestos/facturación** según tu país (los campos fiscales ya existen en el registro).
- [ ] Datos de contacto/soporte visibles.

---

## 13) Monitoreo y respaldos

- [ ] Activa **alertas** de fallos de webhook en Stripe.
- [ ] Revisa periódicamente **Logs** de funciones y errores de Auth.
- [ ] Configura **respaldos** de la base (Supabase → Database → Backups).

---

### Resumen de “qué toca a quién”
- **Supabase**: migraciones 0001–0022, pg_cron, buckets, Auth (Site URL + SMTP), secrets, deploy de funciones.
- **Stripe (Live)**: activar cuenta, habilitar Connect, clave `sk_live`, webhook + `whsec`.
- **Host (Netlify/Vercel)**: variables `VITE_*`, build, dominio + HTTPS.
- **Operación**: onboarding de prestadores, pruebas de humo, legal, monitoreo.
