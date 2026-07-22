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
  migraciones en su flujo). Última en el repo: **0033**.
- Para verificar qué está aplicado en producción: `db/verificar_produccion.sql`.

### 3. Escribir a otros usuarios / notificaciones
- Tabla `notifications` (user_id, type, title, body, data jsonb, is_read). RLS = solo
  leer/actualizar lo propio. **Para notificar a OTRO usuario se usa una función
  `SECURITY DEFINER`** (bypassa RLS) acotada por `is_admin()` o por `auth.uid()`.
- Ejemplos: `admin_send_message`, `request_appointment`, `respond_appointment`,
  `emit_*_appointment_reminders`, `send_message`, `waitlist_notify_slot`.
- La campana (`NotificationsBell`) renderiza por `type`. Tipos vigentes: `post_achievement`,
  `badge`, `appt_*`, `admin_message`, `direct_message`, `booking_request`, `waitlist_slot`,
  `waitlist_join`, `campaign`. **Al añadir un tipo, añade su icono y sus claves i18n.**
- **Todo insert en `notifications` dispara push nativo** vía el trigger `trg_notify_push`
  (migración 0030) → `pg_net` → Edge Function `send-push`. No hay que hacer nada extra.

### 4. Administrador
- Es admin quien tenga `profiles.role = 'admin'` (lo valida `is_admin()`). Se asigna por
  SQL, no hay UI. Panel en `/panel` (Dashboard renderiza `AdminDashboard` si role=admin).
- Secciones admin: metrics, messages, moderation, products, store, renewals, reports,
  billing, other. Roles válidos por constraint: `parent | provider | admin`.
- Folio de miembro visible: `NM-000123` (= `profiles.member_no`).

### 5. Pagos (Stripe)
- Edge Functions: `create-membership-checkout`, `create-product-checkout`,
  `create-consultation-checkout`, `connect-onboarding`, `stripe-webhook`.
- Membresías las cobra la plataforma; productos/consultas van al prestador vía
  **Stripe Connect (Express)** con comisión (application_fee) en productos.
- Secrets (Supabase, NO en el front): `STRIPE_SECRET_KEY` **debe empezar con `sk_`**
  (no `pk_`), `STRIPE_WEBHOOK_SECRET` debe ser del webhook del **mismo modo** (test/live).
- Los precios salen de `membership_fees` + `country_pricing` (sembrados en `db/membership.sql`).
- Las citas admiten cobro digital **opcional** (`appointment_requests.charge_total` /
  `charge_percent` / `payment_status`); el paciente paga con `create-consultation-checkout`
  (acepta importe personalizado) y el webhook marca `payment_status='paid'`.

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
- **`returns table` en PL/pgSQL**: las columnas de salida son VARIABLES dentro del cuerpo.
  Si una consulta usa esa misma columna sin calificar → `42702 column reference is
  ambiguous` y la RPC responde **400**. PL/pgSQL **no valida las consultas al crear la
  función**, así que la migración se aplica "sin errores" y falla en silencio al usarse.
  **Califica siempre con alias** (`a2.provider_id`) y considera `#variable_conflict
  use_column`. Caso real: `admin_badge_inputs` (roto desde 0006, arreglado en 0033).
- **Variables `VITE_*` se incrustan en tiempo de BUILD**: si falta una, Vite la sustituye
  por `undefined` y el minificador **borra el código como muerto**. Pasó con el push: sin
  `VITE_VAPID_PUBLIC_KEY` el bundle sale sin `pushManager`. Tras compilar, verifica:
  `grep -l pushManager dist/assets/*.js`.
- **Desplegar Edge Functions**: usa `supabase functions deploy <nombre> --use-api` para no
  depender de Docker. El nombre debe coincidir EXACTO con la carpeta.
- **vitest no corre en el sandbox** (el `node_modules` es de Windows y rollup usa binario
  nativo). `tsc --noEmit` sí corre, pero es lento; el `npm run build` del usuario manda.
- El `.env` (claves) está en `.gitignore`. Nunca lo versiones ni pongas secretos en el front.

## Estructura rápida
- `src/pages` rutas · `src/components/{admin,provider,parent,onboarding,report,calendar,...}`
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
| `/reservar/:memberNo` | `Book` | pública, sin layout (widget embebible) |

### Hooks por dominio (`src/hooks`)
- **Sesión/perfil**: `useAuth`, `useProfile` (+ `stores/authStore`)
- **Membresía/pagos**: `useMembership`, `usePayments`, `useTransactions`
- **Directorio/búsqueda**: `useDirectory`, `useSearch`, `useProviderProfile`, `useProviderLocations`, `useCategories`
- **Eventos/calendario/citas**: `useEvents`, `useCalendar`, `useAppointmentRequests` (+ `useAppointmentReminders`), `useAgenda`
- **Tienda**: `useShop`, `useProducts`, `useProductReviews`, `useProductModeration`
- **Denuncias**: `useReports` (enviar) · `useMyReports` (seguimiento) · `useAdminReports` (admin)
- **Admin**: `useAdmin`, `useAdminMessages`, `useAdminBilling`, `useAdminRenewals`, `useAdminOther`, `useAdminBadges`
- **Contenido/comunidad**: `useBlog`, `useContent`, `useAcademy`, `useToolkitProgress`
- **Fundador/referidos**: `useFounder`, `useReferral`
- **Clínico**: `useClinical`, `usePrescriptions`, `useSecureFiles`, `useSurvey`, `useTracker`
- **Mensajería**: `useMessages` (hilos, envío, no leídos)
- **Lista de espera / campañas**: `useWaitlist`, `useCampaigns` (en `useWaitlist.ts`)
- **Notificaciones**: `useNotifications` (campana) · **PWA**: `usePwaInstall`
- **Push nativo**: `usePushSubscribe` (permiso + suscripción)

### Componentes clave (`src/components`)
- `layout/AppLayout` — navegación, pie, popups globales, disparo de recordatorios
- `layout/AccessibilityMenu` — Modo calma, dislexia, contraste, tamaño de texto
- `admin/AdminDashboard` — + `AdminMetrics`, `AdminMessages`, `AdminReports`, `AdminRenewals`, `AdminBilling`, `AdminProducts`, `AdminOtherValues`
- `calendar/AppointmentRequests` · `report/ReportModal` + `report/MyReports` · `shop/ProductReviewsModal`
- `provider/BookingWidgetPanel` (widget embebible) · `provider/WaitlistPanel` · `provider/CampaignsPanel`
- `onboarding/GuidedTour` (6 pasos) · `pwa/InstallAppButton` · `ui/*` (`Button`, `Modal`, `PasswordInput`, `StarRating`…)

### RPC principales (todas `SECURITY DEFINER`)
- **Admin**: `admin_metrics`, `admin_reports`, `admin_send_message`, `admin_membership_renewals`, `admin_set_verified/published`
- **Citas**: `request_appointment`, `respond_appointment`, `emit_due_appointment_reminders`, `emit_all_due_appointment_reminders`, `search_patients`
- **Fundador/referidos**: `claim_founder_slot`, `set_founder_optout`, `set_referrer`, `my_referral_count`
- **Mensajería**: `send_message` (valida permiso + notifica), `message_threads` (resumen de hilos)
- **Lista de espera**: `waitlist_join`, `waitlist_add`, `my_waitlist`, `waitlist_set_status`,
  `waitlist_notify_slot` · **Campañas**: `campaign_recipients`
- **Reservas**: `request_booking`, `booking_provider_name`
- **Membresía**: `get_membership_quote`, `redeem_promo_code`

### Edge Functions (`supabase/functions`)
- **Pagos**: `create-membership-checkout`, `create-product-checkout`,
  `create-consultation-checkout`, `connect-onboarding`, `stripe-webhook`
- **Avisos**: `send-reminders` (cola + email de citas aceptadas; la agenda `pg_cron`+`pg_net`),
  `send-push` (Web Push VAPID), `send-campaign` (lista de espera/pacientes por push+email+SMS),
  `send-support`
- Despliegue: `supabase functions deploy <nombre> --use-api`.

### Lógica pura testeable (`src/lib`, con unit tests)
`calendarView` (filtro de eventos, agenda, cuadrícula del mes) · `calendar` (.ics / Google) ·
`referral` (folio NM) · `email` (validación) · `badge` · `utils` · `schemas` (Zod) ·
`meet` (salas Jitsi; valida host con `new URL`, no con regex de texto).
Al extraer lógica de una página a `src/lib`, **añade su test** (patrón: `*.test.ts`).

## Flujo al terminar un cambio
1. `npm run build` en verde (tipos + bundle).
2. Paridad i18n = 0 (script de arriba) si tocaste textos.
3. Si añadiste tabla/RPC, crea su migración idempotente y avísale al usuario que la corra.
4. Nunca commitees `.env`, `node_modules`, `dist`, `_archivo`, `backups`.
