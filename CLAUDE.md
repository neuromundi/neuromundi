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
  migraciones en su flujo). Última aplicada: **0023**.
- Para verificar qué está aplicado en producción: `db/verificar_produccion.sql`.

### 3. Escribir a otros usuarios / notificaciones
- Tabla `notifications` (user_id, type, title, body, data jsonb, is_read). RLS = solo
  leer/actualizar lo propio. **Para notificar a OTRO usuario se usa una función
  `SECURITY DEFINER`** (bypassa RLS) acotada por `is_admin()` o por `auth.uid()`.
- Ejemplos: `admin_send_message`, `request_appointment`, `respond_appointment`,
  `emit_*_appointment_reminders`. La campana (`NotificationsBell`) renderiza por `type`.

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
- El `.env` (claves) está en `.gitignore`. Nunca lo versiones ni pongas secretos en el front.

## Estructura rápida
- `src/pages` rutas · `src/components/{admin,provider,parent,onboarding,report,calendar,...}`
- `src/hooks` lógica de datos (Supabase) · `src/stores` estado (Zustand)
- `src/lib` utilidades puras (buenas para tests) · `src/i18n/locales` traducciones
- `supabase/migrations` SQL · `supabase/functions` Edge Functions · `db` esquema base
- `PRODUCCION.md` runbook de despliegue · `_archivo/` descartes · `backups/` respaldos

## Flujo al terminar un cambio
1. `npm run build` en verde (tipos + bundle).
2. Paridad i18n = 0 (script de arriba) si tocaste textos.
3. Si añadiste tabla/RPC, crea su migración idempotente y avísale al usuario que la corra.
4. Nunca commitees `.env`, `node_modules`, `dist`, `_archivo`, `backups`.
