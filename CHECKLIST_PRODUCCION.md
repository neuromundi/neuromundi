# ✅ Checklist de producción — Neuromundi

Checklist exhaustivo para salir a producción con todo lo construido hasta la
migración **0088**. Marca cada casilla al completarla. Prioridades:
**🔴 bloqueante** · **🟡 importante** · **⚪ opcional**.

> Runbook detallado por servicio: ver `PRODUCCION.md`. Este archivo es la lista
> operativa de verificación de la tanda reciente (tres secciones, Neurocamps,
> campaña, promos, asesor, Herramientas, logos).

---

## 0) Antes de empezar

- [ ] 🟡 Respaldo de la base de datos de producción (Supabase → Database → Backups).
- [ ] 🟡 Trabaja en una ventana de bajo tráfico; ten a mano las claves de Supabase, Stripe, Resend y VAPID.
- [ ] 🔴 Confirma el dominio canónico **www.neuromundi.com** (el `.htaccess` redirige el apex → www; el Site URL de Supabase también debe ser `www`).

---

## 1) 🔴 Base de datos — migraciones

Aplica en el **SQL Editor de Supabase**, en orden, las migraciones nuevas de esta tanda:

- [ ] `0077_promo_discounts.sql` — descuento % en códigos promocionales.
- [ ] `0078_promo_amount_email.sql` — promo de monto fijo + candado por correo.
- [ ] `0079_advisor.sql` — perfil Asesor (blinda `is_advisor` en `protect_profile_columns`).
- [ ] `0080_tribe_forums_plus.sql` — foros ampliados (prefs, moderadores por foro, convocatoria).
- [ ] `0081_campaign.sql` — `campaign_config` + bloqueo de directorio. **Ojo con el seed (ver §6).**
- [ ] `0082_campaign_founder_discount.sql` — descuento de fundador por etapa.
- [ ] `0083_campaign_emails.sql` — cola de emails + cron `nm-campaign-emails`.
- [ ] `0084_raffle_tickets.sql` — boletos de sorteo.
- [ ] `0085_campaign_community_raffle.sql` — `community_url` + sorteo ponderado.
- [ ] `0086_platform_sections.sql` — `profiles.sections`/`neuro_conditions` + `handle_new_user` ampliado.
- [ ] `0087_neurocamps_sections.sql` — `section` en foros + RPC de foros por sección.
- [ ] `0088_neurocamps_events_mentors.sql` — eventos y mentoría por sección.

**Verificación (no debe quedar ningún FALTA):**

- [ ] 🔴 Corre `db/verificar_produccion_0077_0088.sql` → todo **OK**.
- [ ] ⚪ (Histórico) `db/verificar_produccion.sql` cubre hasta 0022.

> ⚠️ **Riesgo alto en 0086**: reescribe `handle_new_user` (afecta TODO registro nuevo).
> Tras aplicarla, haz una prueba de alta por correo y confirma que se crea el perfil
> con `sections`/`neuro_conditions`.

---

## 2) 🟡 Tareas programadas (cron)

- [ ] Corre `db/verificar_cron.sql` → los 6 esperados **OK y activos**:
  `nm-appt-reminders`, `nm-send-reminders`, `nm-suspension-reminders`,
  `nm-purge-suspensions`, `nm-purge-lapsed-founders`, `nm-campaign-emails`.
- [ ] Extra legítimo: `purge-expired-files-cada-hora` (llama a `purge-expired-files`).
- [ ] Confirma que el cron duplicado `send-reminders-cada-10min` **ya no existe** (se eliminó).
- [ ] Si `nm-campaign-emails` existe pero aún no desplegaste `campaign-emails`, hazlo antes (§3).

---

## 3) 🔴 Edge Functions

- [ ] **Desplegar NUEVA**: `campaign-emails` (correos de campaña por Resend):
  ```
  supabase functions deploy campaign-emails --use-api --no-verify-jwt
  ```
- [ ] **Redesplegar** (cambió con la campaña/promos): `create-membership-checkout`:
  ```
  supabase functions deploy create-membership-checkout --use-api
  ```
- [ ] Verifica que estas van **sin JWT** (las llama el cron/Stripe, no un usuario):
  `stripe-webhook`, `send-push`, `send-reminders`, `purge-expired-files`, `campaign-emails`
  → todas con `--no-verify-jwt` (en el panel: "Verify JWT" = OFF).
- [ ] Prueba rápida de `send-reminders` (debe responder 200):
  ```sql
  select net.http_post(url:='https://sboagswcehuxwfjdbhdn.supabase.co/functions/v1/send-reminders',
    headers:='{"Content-Type":"application/json"}'::jsonb, body:='{}'::jsonb);
  select status_code from net._http_response order by id desc limit 1;
  ```
- [ ] Listado completo esperado (14): `campaign-emails`, `connect-onboarding`,
  `create-consultation-checkout`, `create-donation-checkout`, `create-membership-checkout`,
  `create-product-checkout`, `delete-account`, `purge-expired-files`, `send-campaign`,
  `send-product-rejection`, `send-push`, `send-reminders`, `send-support`, `stripe-webhook`.
  Compáralo con `supabase functions list`.

---

## 4) 🔴 Secrets (en Supabase, NO en el front)

- [ ] `RESEND_API_KEY` — correo transaccional/campaña.
- [ ] `CAMPAIGN_FROM` — remitente de campaña, p. ej. `Neuromundi <admin@neuromundi.com>` (dominio verificado en Resend).
- [ ] `SUPPORT_FROM` / `SUPPORT_TO` — correos de soporte.
- [ ] `PUBLIC_SITE_URL` — `https://www.neuromundi.com`.
- [ ] `STRIPE_SECRET_KEY` (empieza con `sk_`, del mismo modo test/live que el webhook).
- [ ] `STRIPE_WEBHOOK_SECRET` — del webhook del mismo modo.
- [ ] `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` (la pública IDÉNTICA a `VITE_VAPID_PUBLIC_KEY`).
- [ ] ⚪ Twilio (solo si usas SMS/WhatsApp de campañas): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM`, `TWILIO_WHATSAPP_FROM`.
- [ ] `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` (normalmente ya presentes).

**Variables del front (`.env`, incrustadas en BUILD):**

- [ ] `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- [ ] `VITE_VAPID_PUBLIC_KEY` (sin ella el push se elimina como código muerto).
- [ ] `VITE_APP_NAME`, `VITE_APP_VERSION`.

---

## 5) 🟡 Storage (buckets)

- [ ] Bucket **`badges`** existe y es **público** (distintivos por tipo de miembro, migración 0066).
- [ ] Bucket `verification` (privado; lectura admin por 0024).
- [ ] Bucket `secure` (archivos clínicos, privado).
- [ ] Avatares/imágenes de producto según tu configuración actual.

---

## 6) 🔴 Configuración de negocio (datos que solo tú cargas)

### ⚠️ Campaña de pre-registro — REVISAR FECHA
El seed de `0081` dejó la campaña **activa** con `start_at = 2026-08-10T06:00:00Z`.
Esa fecha **ya pasó**, por lo que **el directorio está bloqueado ahora** para visitantes
(90 días por defecto; México 30) hasta la fecha de apertura por país. Decide:

- [ ] 🔴 Ajusta en `/panel → Campaña` (o por SQL) `active`, `start_at`, `default_block_days`
  y `block_days_by_country` a tu **cronograma real de lanzamiento**.
- [ ] 🔴 Si NO quieres bloquear el directorio todavía, pon `active = false`.
- [ ] Etapas de descuento de fundador (`founder_discount`, p. ej. 50% ≤15 días, 25% ≤30).
- [ ] Popups de bienvenida por continente (`popup_active`, `popup_continents`).
- [ ] `community_url` (grupo privado Discord/WhatsApp) en `/panel → Campaña`.

### Cuotas y catálogos
- [ ] 🔴 Precios de membresía por **país × tipo × clase** en `/panel → Cuotas`
  (a mano o por CSV). Solo México viene sembrado.
- [ ] ⚪ Códigos promocionales (`/panel → Cuotas → Códigos`), si aplican.
- [ ] ⚪ Importes de donación por moneda (`/panel → Donaciones`).
- [ ] ⚪ Asignar Asesores por folio (`admin_set_advisor`) si vas a usar el perfil Asesor.

---

## 7) 🔴 Frontend — compilar y publicar

- [ ] `npm run build` en **verde** (tipos + bundle). Es el veredicto final.
- [ ] Paridad i18n = 0 (script del `CLAUDE.md`) — ya verificado, reconfirmar tras cualquier cambio.
- [ ] Subir `dist/` a Hostinger.
- [ ] **Subir la carpeta `public/kit/nd/` y `public/kit/af/`** (110 PDFs nuevos de los kits Neurodesarrollo y Afecciones). Sin ellos, los botones de descarga dan 404.
- [ ] Confirmar que ya están los assets de logo optimizados: `logo-header.png`, `logo-neuromundi.webp`, `icon-192/512/512-maskable.png`, `apple-touch-icon.png`, `favicon*`, `og-neuromundi.jpg`, y `tribu/neurocamps-v6.webp`.
- [ ] Verificar el `dist` compilado si tocaste SW/PWA/VITE_*: `grep -l pushManager dist/assets/*.js`.

### Videos pendientes de subir a `public/` (los referencia la app; hoy NO existen)
- [ ] 🟡 `welcome-neuromundi.webm` + `welcome-neuromundi.mp4` (popup de bienvenida de campaña).
- [ ] 🟡 `curso-bienvenida.webm` + `curso-bienvenida.mp4` (curso `/curso-bienvenida`).
  *(Mientras no existan, esos bloques de video no muestran nada; no rompen la página.)*

---

## 8) 🔴 CDN

- [ ] Purgar la caché del CDN en hPanel tras cada despliegue (video, héroe, logos e iconos usan nombres estables; sin purga se sirven viejos).

---

## 9) 🟡 Contenido / decisiones del usuario (no software)

- [ ] Videos de bienvenida y del curso (§7).
- [ ] URL del grupo privado de comunidad (§6).
- [ ] Términos legales del sorteo de la campaña.
- [ ] Revisar/afinar el contenido experto de los kits de Neurodesarrollo y Afecciones si quieres matices locales.

---

## 10) 🟡 Pruebas de humo en producción

- [ ] **Registro consumidor**: alta como "Familiar (padre/madre/tutor/pariente)" y como paciente; marca 1–3 secciones de interés → se guardan en `profiles.sections`.
- [ ] **Registro prestador**: el campo de secciones + (si marca Afecciones) las afecciones que atiende se guardan.
- [ ] **Directorio**: el selector de las 3 secciones filtra por sección + país; los chips de sección salen en las tarjetas; en Afecciones aparece el filtro por afección.
- [ ] **Herramientas** (antes "Kit"): el selector abre el kit de cada sección; abre en tu idioma; **descargar un PDF** de cada kit funciona (probar es, un CJK y un RTL).
- [ ] **Neurocamps** (antes Tribu): el selector de Neurocamp filtra foros; crear foro/evento/mentoría con sección; ruta `/neurocamps` funciona.
- [ ] **Promos**: canjear un código % y uno de monto; probar el candado por correo.
- [ ] **Campaña** (si activa): el bloqueo/countdown por país; el popup por continente; los correos de Resend salen desde `admin@neuromundi.com`.
- [ ] **Push/PWA**: instalar la app muestra el logo nuevo; una notificación llega.
- [ ] **OG**: compartir el enlace muestra `og-neuromundi.jpg` (re-scrape en Facebook si hace falta).
- [ ] **RTL**: en árabe/hebreo la UI y los kits se ven de derecha a izquierda.

---

## 11) ⚪ Post-lanzamiento

- [ ] Vigilar logs de Edge Functions (Resend, Stripe webhook, push) las primeras horas.
- [ ] Confirmar que el cron de campaña envía la 1.ª tanda de correos.
- [ ] Revisar métricas del panel admin (registros, incompletos).

---

### Resumen de bloqueantes 🔴 (lo mínimo para no romper)
1. Migraciones 0077→0088 aplicadas y verificadas.
2. Desplegar `campaign-emails` y redeploy `create-membership-checkout`.
3. Secrets de Resend/Stripe/VAPID presentes.
4. **Decidir el estado de la campaña** (`active`/`start_at`) — hoy bloquea el directorio.
5. Precios de membresía por país.
6. `npm run build` + subir `dist/` **y los PDFs de `public/kit/{nd,af}`** + purgar CDN.
