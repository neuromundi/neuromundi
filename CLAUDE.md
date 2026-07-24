# CLAUDE.md — Guía del proyecto Neuromundi

Contexto para asistentes de IA que trabajen en este repo. Léelo antes de editar.

## Qué es
Marketplace + comunidad global de neurodivergencia/neurodesarrollo. Pre-lanzamiento.
Familias/pacientes se registran gratis; prestadores/comercios/escuelas pagan cuota
anual. Multipaís y multilingüe.

## Stack
- React 18 + Vite 5 + TypeScript + TailwindCSS
- react-router-dom (rutas lazy en `src/App.tsx`), Zustand (`src/stores`)
- react-hook-form + Zod (`src/lib/schemas.ts`)
- react-i18next — 8 idiomas: **es, en, fr, de, it, pt, ja, zh** (fallback `en`)
- Supabase (Auth, Postgres+RLS, Storage, Edge Functions) — `src/lib/supabase.ts`
- Alias de import: `@` → `src`
- PWA con `vite-plugin-pwa` (manifest + service worker; requiere HTTPS real)
- Push nativo Web Push/VAPID (`public/push-sw.js` + Edge Function `send-push`)

## Comandos
```
npm run dev        # desarrollo
npm run build      # tsc -b && vite build  (verificación definitiva de tipos)
npm run test       # vitest
npm run typecheck  # tsc --noEmit
```
La verificación que NO debe fallar antes de entregar: `npm run build`.

## Reglas críticas (no romper)

### 1. i18n con paridad total
- Las cadenas visibles usan `t('clave')`. Las claves viven en `src/i18n/locales/*.json`.
- **Toda clave nueva debe existir en los 8 idiomas.** La paridad debe ser exacta.
- Verifica la paridad tras cualquier cambio de textos:
```
python3 - <<'PY'
import json,glob
L=['es','en','fr','de','it','pt','ja','zh']
def flat(d,p=''):
    o=set()
    for k,v in d.items():
        q=f'{p}.{k}' if p else k
        o|=flat(v,q) if isinstance(v,dict) else {q}
    return o
s={l:flat(json.load(open(f'src/i18n/locales/{l}.json',encoding='utf-8'))) for l in L}
base=s['es']
for l in L: print(l, 'MISS',len(base-s[l]),'EXTRA',len(s[l]-base))
PY
```

### 2. Migraciones
- Van en `supabase/migrations/NNNN_nombre.sql`, **numeradas y en orden**.
- El esquema base histórico está en `db/*.sql`.
- **Deben ser idempotentes**: `create table if not exists`, `create or replace function`,
  `drop policy if exists` + `create policy`, `insert ... on conflict do nothing`,
  `add column if not exists`. Backfills solo tocan filas nulas.
- El usuario las aplica **a mano en el SQL Editor de Supabase**, en orden (no hay CLI de
  migraciones en su flujo). Última en el repo: **0055**.
- Para verificar qué está aplicado en producción: `db/verificar_produccion.sql`.

### 3. Escribir a otros usuarios / notificaciones
- Tabla `notifications` (user_id, type, title, body, data jsonb, is_read). RLS = solo
  leer/actualizar lo propio. **Para notificar a OTRO usuario se usa una función
  `SECURITY DEFINER`** (bypassa RLS) acotada por `is_admin()` o por `auth.uid()`.
- Ejemplos: `admin_send_message`, `request_appointment`, `respond_appointment`,
  `emit_*_appointment_reminders`, `send_message`, `waitlist_notify_slot`.
- La campana (`NotificationsBell`) renderiza por `type`. Tipos vigentes: `post_achievement`,
  `badge`, `appt_*`, `admin_message`, `direct_message`, `booking_request`, `waitlist_slot`,
  `waitlist_join`, `campaign`, `commission_paid`, `directory_match`. **Al añadir un tipo,
  añade su icono y sus claves i18n.**
- **Todo insert en `notifications` dispara push nativo** vía el trigger `trg_notify_push`
  (migración 0030) → `pg_net` → Edge Function `send-push`. No hay que hacer nada extra.
- **Preferencias de push** (migración 0049): `notification_prefs` (push_enabled +
  `muted_categories[]`). El trigger consulta esa tabla y NO empuja si el push está apagado o
  la categoría está silenciada; la campana in-app SIEMPRE guarda todo. Las categorías las
  define `notif_category()` en SQL y `src/lib/notificationPrefs.ts` en el front: **si añades
  un tipo nuevo, clasifícalo en AMBOS** o caerá en "otras". UI en `Ajustes`.

### 4. Administrador
- Es admin quien tenga `profiles.role = 'admin'` (lo valida `is_admin()`). Se asigna por
  SQL, no hay UI. Panel en `/panel` (Dashboard renderiza `AdminDashboard` si role=admin).
- Secciones admin: metrics, messages, moderation, products, store, renewals, reports,
  billing, fees (cuotas por país + carga/descarga CSV), referrals (programa de
  recomendación), other. Roles válidos por constraint: `parent | provider | admin`.
- Folio de miembro visible: `NM-000123` (= `profiles.member_no`).

### 5. Pagos (Stripe)
- Edge Functions: `create-membership-checkout`, `create-product-checkout`,
  `create-consultation-checkout`, `connect-onboarding`, `stripe-webhook`.
- **Quién cobra qué**: las **membresías** las cobra la plataforma (su propia cuenta
  Stripe). Los **productos y las consultas** los cobra íntegros el prestador vía
  **Stripe Connect (Express)** con `transfer_data.destination`, **SIN
  `application_fee`**: Neuromundi no retiene nada de esas ventas. Si un producto se
  vendió con código de promotor, la comisión solo se REGISTRA (ver el libro de
  comisiones en las reglas de negocio) y la paga el vendedor por su cuenta.
- Eventos del webhook que hay que tener suscritos: `checkout.session.completed`,
  `invoice.paid`, `invoice.payment_failed`, `account.updated` y **`charge.refunded`**
  (este último revierte la comisión del promotor; sin él, un reembolso no se entera).
- Secrets (Supabase, NO en el front): `STRIPE_SECRET_KEY` **debe empezar con `sk_`**
  (no `pk_`), `STRIPE_WEBHOOK_SECRET` debe ser del webhook del **mismo modo** (test/live).
- Los precios de membresía salen de `membership_prices` (país × tipo de afiliado ×
  clase de miembro, con importe mensual/anual/referencia), con `membership_fees` como
  respaldo. `db/membership.sql` tiene la siembra histórica.
- Las citas admiten cobro digital **opcional** (`appointment_requests.charge_total` /
  `charge_percent` / `payment_status`); el paciente paga con `create-consultation-checkout`
  (acepta importe personalizado) y el webhook marca `payment_status='paid'`.
- **Inventario** (migración 0055): `products.stock` (NULL = sin control; 0 = agotado). El
  checkout de producto rechaza si stock ≤ 0 y el webhook llama `decrement_stock` (atómico,
  nunca baja de cero) al confirmarse el pago. La Tienda marca "Agotado" y deshabilita comprar.

### 6. Push nativo (VAPID)
- Claves: `VITE_VAPID_PUBLIC_KEY` (front, **en tiempo de build**) debe ser IDÉNTICA a
  `VAPID_PUBLIC_KEY` (secret). Además `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` como secrets.
- Genera el par con `npx web-push generate-vapid-keys`. La privada NUNCA va al front.
- Suscripciones en `push_subscriptions` (RLS propia). El SW importa `public/push-sw.js`
  vía `workbox.importScripts` en `vite.config.ts`.
- iOS solo entrega push si la PWA está **instalada en la pantalla de inicio** (16.4+).

## Trampas del entorno (importantes)
- **Chunking manual roto**: NO uses `build.rollupOptions.output.manualChunks` para
  separar vendors (React/Supabase/…). Provocó un ciclo de inicialización (TDZ:
  "Cannot access 'Ei' before initialization") y pantalla blanca. Deja el chunking por
  defecto de Vite; las páginas ya son lazy.
- **Herramienta de edición**: en el disco montado, editar archivos grandes puede
  truncarlos. Preferir escribir con heredoc de bash / Python y **verificar el balance**
  de llaves/paréntesis tras escribir.
- **git en el mount**: el sistema de archivos montado no soporta bien las operaciones de
  git (locks/objetos). El repo se inicializa, pero el `commit` conviene hacerlo en la
  máquina del usuario (Windows nativo).
- **Cambiar el tipo de retorno de una función exige `DROP FUNCTION` primero**:
  `create or replace` NO puede alterar las columnas de salida (`returns table`) ni el
  tipo devuelto → `42P13 cannot change return type of existing function`. Si modificas
  la firma de una RPC ya aplicada, antepón `drop function if exists public.fn(args);`
  con los MISMOS tipos de argumento. Nos pasó con `set_referrer` y `admin_referrals`.
- **`create or replace VIEW` no reordena ni renombra columnas**: solo puede AÑADIR columnas
  al final. Si antepones o renombras una columna existente → `42P16 cannot change name of
  view column`. Hay que `drop view if exists` primero (las vistas hoja se pueden dropear sin
  riesgo). Nos pasó en 0050 al anteponer `id` a `provider_id` en `public_provider_comments`.
- **`returns table` en PL/pgSQL**: las columnas de salida son VARIABLES dentro del cuerpo.
  Si una consulta usa esa misma columna sin calificar → `42702 column reference is
  ambiguous` y la RPC responde **400**. PL/pgSQL **no valida las consultas al crear la
  función**, así que la migración se aplica "sin errores" y falla en silencio al usarse.
  **Califica siempre con alias** (`a2.provider_id`) y considera `#variable_conflict
  use_column`. Casos reales: `admin_badge_inputs` (roto desde 0006, arreglado en 0033) y su
  gemela `my_badge_inputs` (rota desde 0007, arreglada en 0044 — al corregir una función,
  **busca sus hermanas con el mismo cuerpo**; aquí se arregló una y la otra quedó rota un
  mes más). Para barrer el repo: buscar funciones `returns table` en PL/pgSQL cuyas columnas
  de salida aparezcan sin calificar en el cuerpo.
- **`supabase.auth.signOut()` es 'global' por defecto**: pide al servidor revocar todas
  las sesiones, lo que exige un token vigente. Con el token vencido responde **403** y la
  sesión del navegador puede quedarse a medias (sales, recargas y vuelves a estar dentro).
  `authStore.signOut` reintenta con `{ scope: 'local' }`. Tras borrar la cuenta hay que ir
  directo a `'local'`: el usuario ya no existe y el global siempre daría 403.
- **Variables `VITE_*` se incrustan en tiempo de BUILD**: si falta una, Vite la sustituye
  por `undefined` y el minificador **borra el código como muerto**. Pasó con el push: sin
  `VITE_VAPID_PUBLIC_KEY` el bundle sale sin `pushManager`. Tras compilar, verifica:
  `grep -l pushManager dist/assets/*.js`.
- **La regla de idioma inicial está duplicada en dos sitios**: `resolveInitialLanguage()` y
  `STORAGE_KEY` en `src/i18n/index.ts`, y una copia en el plugin `preloadLocaleChunk` de
  `vite.config.ts` (corre en Node al compilar y no puede importar el TS de la app). Ese
  plugin inyecta el `<link rel="modulepreload">` del diccionario para que se descargue EN
  PARALELO al bundle; sin él la cadena es `index.js → xx.js → React monta` y el LCP se va
  ~1.9 s en "retraso de renderización". Si cambias la regla, cámbiala en los dos.
- **La precarga del héroe va condicionada a la portada**: `index.html` se sirve en TODAS
  las rutas (es una SPA), pero el héroe solo existe en `/`. Con un `<link rel="preload">`
  estático, entrar a `/panel` descargaba una imagen que nadie usaba y el navegador lo
  avisaba en consola. Por eso se inyecta desde un script en línea que comprueba
  `location.pathname`. Si mueves `HeroArt` a otra página, ajusta esa condición.
- **Los modales del layout van con `lazy`**: `AppLayout` monta ~12 emergentes (AuthModals,
  SocialOnboarding, GuidedTour…). Importarlos de forma estática mete react-hook-form, zod
  y `mxStatesMunicipalities` (43 KB) en el bundle inicial aunque no se vean. Si añades un
  modal al layout, añádelo con `lazy` + `<Suspense fallback={null}>` y condicionado.
- **UI no crítica aplazada con `deferUi`**: el banner de registro suave y el botón flotante
  de soporte estaban SIEMPRE montados, así que sus chunks entraban en la cadena crítica del
  LCP (se veían como nodos `SoftSignupBanner`/`SupportButton` en el árbol de red). Se montan
  tras `requestIdleCallback` (estado `deferUi`). Si añades UI que no se ve en el primer
  pintado, gátala igual.
- **El preconnect a Supabase necesita `crossorigin`**: las llamadas a la API van con
  cabeceras (`apikey`/`Authorization`) → son CORS. Sin `crossorigin`, el navegador abre una
  conexión que NO reutiliza para esos fetch y el preconnect se desperdicia (~300 ms de LCP).
- **`beforeinstallprompt` se captura a nivel de módulo**: el evento se dispara UNA vez al
  cargar. `usePwaInstall` lo cachea en el módulo y notifica a los suscriptores, para que un
  botón que monta tarde (el de instalar dentro del menú "Más" de móvil) no se lo pierda. Si
  registraras el listener por instancia, ese botón nunca podría instalar. `InstallAppButton`
  va en el pie Y en la hoja "Más" (en el pie queda bajo la barra inferior fija de móvil).
- **Desplegar Edge Functions**: usa `supabase functions deploy <nombre> --use-api` para no
  depender de Docker. El nombre debe coincidir EXACTO con la carpeta.
- **vitest no corre en el sandbox** (el `node_modules` es de Windows y rollup usa binario
  nativo). `tsc --noEmit` sí corre, pero es lento; el `npm run build` del usuario manda.
- El `.env` (claves) está en `.gitignore`. Nunca lo versiones ni pongas secretos en el front.

## Estructura rápida
- `src/pages` rutas · `src/components/{admin,provider,merchant,parent,onboarding,report,calendar,...}`
- `src/hooks` lógica de datos (Supabase) · `src/stores` estado (Zustand)
- `src/lib` utilidades puras (buenas para tests) · `src/i18n/locales` traducciones
- `supabase/migrations` SQL · `supabase/functions` Edge Functions · `db` esquema base
- `PRODUCCION.md` runbook de despliegue · `_archivo/` descartes · `backups/` respaldos

## Mini-índice (dónde está cada cosa)

### Rutas → página (`src/App.tsx`, todas lazy)
| Ruta | Página | Nota |
|---|---|---|
| `/` | `Home` | |
| `/directorio` · `/proveedor/:id` | `Directory` · `ProviderProfile` | mapa Leaflet |
| `/buscar` | `SearchPage` | RPC `search_all` |
| `/eventos` | `Events` | eventos curados por admin |
| `/tienda` | `Store` | oculta en el menú móvil |
| `/kit` | `Toolkit` | |
| `/academy` · `/academy/:id` | `Academy` · `Course` | |
| `/blog` · `/contenido/:id` · `/autor/:id` | `Blog` · `Post` · `Author` | |
| `/inclusion-escolar` | `SchoolInclusion` | |
| `/pregunta-al-experto` | `AskExpert` | |
| `/crear-cuenta` · `/entrar` | `CreateAccount` · `Auth` | |
| `/lista/:token` | `SharedList` | pública por token |
| `/terminos` `/privacidad` `/proteccion-datos` `/reglamento` `/manifiesto` `/conocer-mas` | legales | |
| **`/panel`** | `Dashboard` | **protegida**; renderiza `AdminDashboard`, `ProviderDashboard` o `ParentDashboard` según rol |
| **`/ajustes`** | `Settings` | **protegida** |
| **`/calendario`** | `Calendar` | **protegida** |
| **`/mensajes`** | `Messages` | **protegida**; mensajería directa |
| `/donar` | `Donate` | pública; donación con o sin cuenta (`DonationSection`) |
| `/donantes` | `DonorWall` | pública; muro de donantes (`donor_wall()`) |
| `/reservar/:memberNo` | `Book` | pública, sin layout (widget embebible) |

### Hooks por dominio (`src/hooks`)
- **Sesión/perfil**: `useAuth`, `useProfile` (+ `stores/authStore`)
- **Membresía/pagos**: `useMembership`, `usePayments`, `useTransactions`
- **Directorio/búsqueda**: `useDirectory`, `useSearch`, `useProviderProfile`, `useProviderLocations`, `useCategories`
- **Eventos/calendario/citas**: `useEvents`, `useCalendar`, `useAppointmentRequests` (+ `useAppointmentReminders`), `useAgenda`
- **Tienda**: `useShop`, `useProducts`, `useProductReviews`, `useProductModeration`
- **Denuncias**: `useReports` (enviar) · `useMyReports` (seguimiento) · `useAdminReports` (admin)
- **Admin**: `useAdmin`, `useAdminMessages`, `useAdminBilling`, `useAdminRenewals`, `useAdminOther`, `useAdminBadges`, `useAdminPricing` (cuotas por país/tipo/clase + config del programa de recomendación)
- **Recomendación**: `useReferralProgram` (enlace propio, resumen, reporte admin)
- **Comisiones de afiliados**: `useCommissions('earned' | 'owed')` (libro + marcar pagado)
- **Portero de membresía**: `useMembershipGate` (apaga el panel si la cuota no está cubierta)
- **Contenido/comunidad**: `useBlog`, `useContent`, `useAcademy`, `useToolkitProgress`
- **Fundador/referidos**: `useFounder`, `useReferral`
- **Clínico**: `useClinical`, `usePrescriptions`, `useSecureFiles`, `useSurvey`, `useTracker`
- **Mensajería**: `useMessages` (hilos, envío, no leídos). En el compositor, el ADMIN ve un
  buscador de miembro (folio/nombre/apellido vía `search_members`) que reemplaza el campo de
  folio manual; los demás roles siguen escribiendo el folio a mano.
- **Lista de espera / campañas**: `useWaitlist`, `useCampaigns` (en `useWaitlist.ts`)
- **Notificaciones**: `useNotifications` (campana) · **PWA**: `usePwaInstall`
- **Push nativo**: `usePushSubscribe` (permiso + suscripción)

### Componentes clave (`src/components`)
- `layout/AppLayout` — navegación, pie, popups globales, disparo de recordatorios
- `layout/AccessibilityMenu` — Modo calma, dislexia, contraste, tamaño de texto
- `admin/AdminDashboard` — + `AdminMetrics`, `AdminMessages`, `AdminReports`, `AdminRenewals`, `AdminBilling`, `AdminProducts`, `AdminOtherValues`, `AdminFees` (+ `FeesCsvPanel`), `AdminReferrals`
- `membership/AccountInactiveModal` · `membership/AccountReactivatedModal` — portero de cuota
- `donation/DonationSection` (embudo `/donar`) · `donation/AlliesCarousel` · `admin/AdminDonations`
  (estadística + curación del muro + CRUD de aliados + **importes por moneda**) · página `DonorWall` (`/donantes`)
- `calendar/AppointmentRequests` · `report/ReportModal` + `report/MyReports` · `shop/ProductReviewsModal`
- `provider/BookingWidgetPanel` (widget embebible) · `provider/WaitlistPanel` · `provider/CampaignsPanel`
- `merchant/AffiliatePanel` (código y enlace propios) + `merchant/CommissionsPanel`
  (libro "me deben / yo debo", marcar liquidación, estado de cuenta CSV)
- `onboarding/GuidedTour` (6 pasos) · `pwa/InstallAppButton` · `ui/*` (`Button`, `Modal`, `PasswordInput`, `StarRating`…)
- `provider/SchoolInclusionPanel` (editor del programa de inclusión, escuelas/clínicas; guarda
  en `provider_details` jsonb) · `directory/SchoolInclusionInfo` (muestra programa/admisiones/grados
  en el perfil público)
- `clinical/MilestoneGuide` (guía de hitos por edad, datos en `src/data/milestonesGuide.ts`,
  orientación NO diagnóstico; botón "registrar" alimenta el rastreador local `MilestoneTracker`)

### RPC principales (todas `SECURITY DEFINER`)
- **Admin**: `admin_metrics`, `admin_reports`, `admin_send_message`, `admin_membership_renewals`, `admin_set_verified/published`
- **Citas**: `request_appointment`, `respond_appointment`, `emit_due_appointment_reminders`, `emit_all_due_appointment_reminders`, `search_patients`
- **Fundador/referidos**: `claim_founder_slot`, `set_founder_optout`, `set_referrer`, `my_referral_count`
- **Mensajería**: `send_message` (valida permiso + notifica; admin/prestador pueden escribir a
  cualquiera), `message_threads` (resumen de hilos), `search_members` (búsqueda admin por
  folio/nombre/apellido), `search_patients` (búsqueda acotada del especialista)
- **Lista de espera**: `waitlist_join`, `waitlist_add`, `my_waitlist`, `waitlist_set_status`,
  `waitlist_notify_slot` · **Campañas**: `campaign_recipients`
- **Reservas**: `request_booking`, `booking_provider_name`
- **Membresía**: `get_membership_quote`, `redeem_promo_code`, `my_membership_options`
  (opciones mensual/anual del usuario), `membership_price_for`, `affiliate_type_for`
- **Cuotas (admin)**: `admin_country_prices`, `admin_configured_countries`,
  `admin_set_country_price`, `admin_export_membership_prices`,
  `admin_import_membership_prices` (CSV), `normalize_country`
- **Recomendación**: `set_referrer`, `my_referral_summary`, `admin_referrals`,
  `admin_set_referral_config`, `grant_referral_credit`, `consume_referral_credit`
- **Comisiones de afiliados**: `my_commissions_earned`, `my_commissions_owed`,
  `mark_commissions_paid` (la autorización es el `where vendor_id = auth.uid()`),
  `admin_commissions`, `resolve_affiliate`
- **Distintivo**: `my_badge_inputs`, `admin_badge_inputs`, `refresh_all_badges`
- **Métricas de perfil**: `track_profile_event(provider, 'view'|'contact')` (anon+auth, sin
  autoconteo, dedupe diario del miembro) · `provider_metrics()` (resumen del propio prestador).
  `ProviderProfile` registra vista al abrir y contacto al pulsar; panel en pestaña "Métricas".
- **Reseñas**: vista pública `public_provider_comments` (id + comentario + promedio + respuesta,
  sin datos del padre; ahora ESTÁNDAR, no opcional) · `respond_review(survey_id, texto)`
  (solo el prestador dueño responde). Se muestran en `ProviderProfile` (`ProviderReviews`) y
  se responden en la pestaña "Mis Calificaciones" del panel.

### Edge Functions (`supabase/functions`)
- **Pagos**: `create-membership-checkout`, `create-product-checkout`,
  `create-consultation-checkout`, `create-donation-checkout`, `connect-onboarding`, `stripe-webhook`
- **Avisos**: `send-reminders` (cola + email de citas aceptadas; la agenda `pg_cron`+`pg_net`),
  `send-push` (Web Push VAPID), `send-campaign` (lista de espera/pacientes por push+email+SMS),
  `send-support`, `send-product-rejection`
- **Mantenimiento**: `purge-expired-files`, `delete-account`
- Despliegue: `supabase functions deploy <nombre> --use-api`.
- **Las que NO invoca un usuario con sesión van con `--no-verify-jwt`**: `stripe-webhook`
  (la llama Stripe), `send-push` y `send-reminders` (las llama la base por `pg_net`, sin
  cabecera Authorization) y `purge-expired-files` (cron). Si se despliegan sin ese flag
  responden **401** y el fallo es silencioso: el trigger `tg_notify_push` traga la excepción
  a propósito para no bloquear el insert, así que la notificación in-app se ve y el push
  simplemente no llega.

### Lógica pura testeable (`src/lib`, con unit tests)
`calendarView` (filtro de eventos, agenda, cuadrícula del mes) · `calendar` (.ics / Google) ·
`referral` (folio NM) · `email` (validación) · `badge` · `utils` · `schemas` (Zod) ·
`meet` (salas Jitsi; valida host con `new URL`, no con regex de texto) ·
`pricing` (anual = 10 meses, referencia = 12) · `feesCsv` (lectura/escritura del CSV de cuotas) ·
`commissions` (totales por moneda, agrupación por contraparte, estado de cuenta CSV;
ojo con las monedas sin decimales: JPY no se divide entre 100).
Al extraer lógica de una página a `src/lib`, **añade su test** (patrón: `*.test.ts`).

## Migraciones recientes (referencia)
| # | Qué añade |
|---|---|
| 0024 | Lectura admin del bucket `verification` |
| 0025 | Productos corporativos destacados (auto `is_featured`) |
| 0026 | Widget de reserva: `booking_requests` + `request_booking` |
| 0027 | Citas: modalidad (presencial/en línea) + cobro opcional |
| 0028 | Recordatorio por email + cron de `send-reminders` |
| 0029 | Mensajería: `messages` + `send_message` + `message_threads` |
| 0030 | Push: `push_subscriptions` + trigger `trg_notify_push` |
| 0031 | Lista de espera automatizada + `campaigns` |
| 0032 | Producto: `store_category_other` obligatorio si categoría = `otro` |
| 0033 | Arregla `admin_badge_inputs` (ambigüedad `provider_id`) |
| 0034 | Programa de recomendación: `referral_config`, `referrals`, `set_referrer` |
| 0035 | Crédito de recomendación sobre la suscripción viva |
| 0036 | `membership_prices` + cuotas por tipo/país editables por el admin |
| 0037 | `admin_country_prices` + `admin_configured_countries` |
| 0038 | Estructura de cuotas: mensual/anual/referencia × fundador/ordinaria |
| 0039 | Clasificación médica: `is_medical_profession`, `affiliate_type_for` |
| 0040 | `my_membership_options` (opciones de pago del usuario) |
| 0041 | `normalize_country()` + deduplicación de países |
| 0042 | Importación/exportación de cuotas en CSV |
| 0043 | Libro de comisiones de afiliados (`affiliate_commissions`) |
| 0044 | Arregla `my_badge_inputs` (misma ambigüedad que 0033) |
| 0045 | Donaciones: `donations` + `donor_wall()` (etapa 1: captura y cobro) |
| 0046 | Donaciones etapa 2: `allies` + admin (stats, lista, curar muro) |
| 0047 | `donation_tiers`: importes de donación por moneda, editables por admin |
| 0048 | `search_members`: búsqueda de miembros para el admin (folio/nombre) |
| 0049 | `notification_prefs` + push por categoría (el trigger las respeta) |
| 0050 | Reseñas públicas (`public_provider_comments` estándar) + `respond_review` |
| 0051 | Métricas de perfil: `profile_events` + `track_profile_event` + `provider_metrics` |
| 0052 | Plantillas de mensaje (`message_templates`, privadas por dueño) |
| 0053 | Bloqueos de agenda (`provider_time_off`); `generateSlots` los resta |
| 0054 | Alertas de búsqueda (`search_alerts`) + aviso al publicar perfil |
| 0055 | Inventario de productos (`stock` + `decrement_stock` en el webhook) |

## Reglas de producto/negocio ya implementadas
- **Clasificación "Otro"**: si `products.store_category = 'otro'`, `store_category_other`
  es **obligatorio** (Zod + CHECK en la base) y la Tienda muestra ese texto en su lugar.
- **Denuncias**: la categoría "Otro" también exige detalle.
- **Tienda**: control de dos opciones "Toda la tienda" / "Productos Neuromundi"
  (filtra `is_featured`) bajo la portada. Neuromundi no cobra comisión (texto legal fijo).
- **Prestadores** (todos menos pacientes/padres): widget de reserva, alertas
  anti-ausentismo (email + in-app), citas presenciales/en línea con cobro opcional,
  mensajería con enlaces de video, sala nativa Jitsi, lista de espera + campañas.
- **Cuotas**: dos periodicidades que el usuario elige al pagar (mensual o anual) y dos
  clases de miembro (fundador / ordinaria). **El anual siempre cobra 10 meses de 12**; el
  importe de 12 se guarda como precio de referencia para mostrarlo tachado (`src/lib/pricing.ts`).
  Sembrado solo México: fundador 1,000/10,000 (ref. 12,000) y ordinaria 1,500/15,000
  (ref. 18,000) MXN, para **especialistas médicos**. El resto de tipos y países los captura
  el admin en `/panel` → Cuotas, a mano o por CSV.
- **Clasificación médica**: `affiliate_type_for()` decide si alguien paga como
  `medical_specialist` o `nonmedical_specialist` a partir de su profesión (criterio ISCO-08
  grupo 221 + Ley General de Salud art. 79). Ante la duda (`'otro'`, profesión desconocida)
  cae a NO médico para no cobrar de más; el admin puede corregir con `is_medical_override`.
- **Comisiones de promoción (afiliados de productos)**: cada prestador fija libremente su
  código y su % en `affiliate_codes`. **La plataforma NO retiene el dinero**: el checkout de
  productos ya NO manda `application_fee_amount`, el vendedor cobra el 100% y le paga al
  promotor por su cuenta. `affiliate_commissions` (0043) es solo el libro: `payable` →
  `paid` (lo marca el vendedor, que dispara aviso al promotor) o `reversed` (reembolso antes
  de liquidar). Si el reembolso llega después del pago se marca `refund_after_payment` sin
  tocar el estado, porque el dinero sí salió. **No vuelvas a poner el `application_fee` sin
  cambiar el libro**, o el promotor cobraría dos veces. Sin retención: la comisión es
  cobrable en cuanto el pedido se marca pagado; retener o no es decisión del vendedor.
  Ojo, esto es DISTINTO del programa de recomendación de membresías de abajo.
- **Donaciones** (migración 0045, `src/lib/donation.ts`): embudo con 4 niveles por monto
  (Semilla/Aliado/Impulsor/Embajador). Umbrales POR MONEDA (USD 10/50/100/150, MXN
  200/1000/2000/3000; la moneda se decide por país del donante, USD por defecto). La física
  aplica del nivel 2 en adelante → dispara la casilla de renuncia y el formulario de envío.
  Puede donar cualquiera, con o sin cuenta (`create-donation-checkout` acepta invitado; el
  monto y nivel se RECALCULAN en el servidor). El cobro lo hace la plataforma (pago único,
  sin Connect). El webhook (`kind==='donation'`) marca pagada y, si es miembro, otorga curso
  e insignia (`grant_course`/`grant_badge`) y avisa por la campana (`donation_thanks`). El
  muro (`donor_wall()`, anónimo) solo muestra lo pagado + consentido + `wall_published`.
  **Etapa 2 (migración 0046):** página pública `/donantes` (`DonorWall`, destacados primero),
  carrusel de aliados en el home (`AlliesCarousel`, tabla `allies`, respeta
  `prefers-reduced-motion` y se pausa al enfocar), y sección **Donaciones** en el panel admin
  (`AdminDonations`): estadística por moneda, curación del muro (`admin_set_donation_wall`,
  solo publica a quien consintió), CRUD de aliados e **importes por moneda**. Falta aún
  atar `grant_course` a la inscripción real de Academy.
- **Importes de donación** (migración 0047): los cuatro escalones por moneda (USD/MXN/EUR
  sembradas) viven en `donation_tiers`, editables en `/panel` → Donaciones. La página los lee
  con `useDonationTiers` y la Edge Function `create-donation-checkout` los **revalida** contra
  esa tabla (con respaldo en código). `src/lib/donation.ts` da los valores por defecto y su
  lógica de niveles es parametrizable por un mapa de monedas.
- **Programa de recomendación**: enlace único por usuario (su folio NM), 5% de descuento
  adicional configurable, **solo sobre el primer pago** y el enlace **caduca a los 7 días**.
  Si quien lo usa es paciente o padre no hay descuento ni recompensa (su membresía ya es
  gratuita), pero **el uso sí se registra**. Los descuentos se acumulan sobre el precio ya
  rebajado. El usuario NO puede editar su código ni su %: ambos son del admin.

## Despliegue
- El frontend vive en **Hostinger** (Apache). Se confirma con `curl -sI https://www.neuromundi.com`
  → cabecera `Server: hcdn`. **No es Netlify ni Vercel**: `netlify.toml`, `vercel.json` y
  `public/_redirects` son restos sin efecto. Lo que manda es **`public/.htaccess`**
  (HTTPS, ruteo SPA, compresión y caché).
- Tras cada despliegue hay que **purgar la caché del CDN** en hPanel; si no, los archivos
  con nombre estable (video, héroe) siguen sirviéndose viejos.
- Runbook completo de puesta en producción: **`PRODUCCION.md`**.

## Flujo al terminar un cambio
1. `npm run build` en verde (tipos + bundle).
2. Paridad i18n = 0 (script de arriba) si tocaste textos.
3. Si añadiste tabla/RPC, crea su migración idempotente y avísale al usuario que la corra.
4. Si tocaste el SW, la PWA o variables `VITE_*`, verifica el `dist` compilado
   (`grep` de lo esperado en `dist/assets/*.js` y `dist/sw.js`).
5. Si el cambio afecta al despliegue o pide algo del usuario (correr SQL, redesplegar
   una función, tocar Stripe), actualiza también **`PRODUCCION.md`**.
6. Nunca commitees `.env`, `node_modules`, `dist`, `_archivo`, `backups`.

## Cómo trabaja aquí el asistente
- **No dejes temas pendientes**: si algo queda a medias hay que decirlo explícitamente,
  no esconderlo en un "más adelante". Lo único que se difiere es lo que exige las manos
  del usuario (correr SQL, desplegar, borrar archivos que el mount no deja borrar).
- **Al corregir un fallo, busca sus hermanos.** El caso `admin_badge_inputs` /
  `my_badge_inputs` costó semanas por arreglar solo una de las dos.
- **Antes de afirmar cómo está configurado el entorno, verifícalo.** El hosting se
  dedujo mal dos veces desde los archivos del repo (`netlify.toml`, `vercel.json`)
  cuando bastaba un `curl -sI` para ver `Server: hcdn`.
- Las pruebas de la lógica pura son la red de seguridad barata: `vitest` no corre en el
  sandbox, así que el `npm run test` y el `npm run build` del usuario son el veredicto.
