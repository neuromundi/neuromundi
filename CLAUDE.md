# CLAUDE.md — Guía del proyecto Neuromundi

Contexto para asistentes de IA que trabajen en este repo. Léelo antes de editar.

## Qué es
Marketplace + comunidad global de neurodivergencia/neurodesarrollo. Pre-lanzamiento.
Familias/pacientes se registran gratis; prestadores/comercios/escuelas pagan cuota
anual. Multipaís y multilingüe.

**TRES SECCIONES (0086/0087)**: la plataforma abarca **Neurodesarrollo**,
**Neurodivergencias** y **Afecciones neurológicas** (`sections` = `neurodesarrollo` |
`neurodivergencias` | `afecciones`). Fuente única en `src/data/sections.ts` (color+ícono);
nombres i18n `sections.<value>.name`. Los prestadores declaran a cuáles pertenecen
(`profiles.sections text[]`) y, en afecciones, qué atienden (`profiles.neuro_conditions text[]`,
catálogo `src/data/neuroConditionsCatalog.ts` basado en CIE-11 Cap.08 + IGAP OMS). El
directorio tiene un **selector de sección** (`sectionStore`, persistido) junto al de país;
`useDirectory` filtra por `section`/`neuroCondition`. Los prestadores lo declaran con el componente `SectionsField` (con sub-selección de afecciones);
los **consumidores** (paciente/**familiar** = padre/madre/tutor/pariente) marcan sus secciones de
interés con casillas en `RegisterForm` (`reg.sectionsInterest`, guardado también en
`profiles.sections`). Las empresas de empleo NO lo declaran. **Nota de marca**: en el registro,
el tipo antes "Padre/madre o tutor" ahora se llama **"Familiar (padre/madre/tutor/pariente)"**
(`reg.typeParent`/`create.cards.parent.title`), y los textos de condición abarcan las tres áreas
(neurodesarrollo, neurodivergencia y afección neurológica).

## Stack
- React 18 + Vite 5 + TypeScript + TailwindCSS
- react-router-dom (rutas lazy en `src/App.tsx`), Zustand (`src/stores`)
- react-hook-form + Zod (`src/lib/schemas.ts`)
- react-i18next — 11 idiomas: **es, en, fr, de, it, pt, ja, zh, ar, he, ko**. `fallbackLng`
  apunta al PROPIO idioma (no a `en`), así que la paridad de claves DEBE ser 0 o se ven
  claves crudas. **Árabe y hebreo son RTL**: `applyDirection()` fija `dir="rtl"` en `<html>`
  (japonés/chino/coreano son LTR). El sentido de lectura se pone desde el primer pintado en el
  script en línea de `vite.config.ts` (misma regla que `resolveInitialLanguage`).
  **Traducción COMPLETA**: TODAS las claves están en los 11 idiomas con paridad 0
  (verificado con el script de abajo tras cada cambio de textos; el total crece con cada
  módulo nuevo —empresas, esparcimiento, oportunidades, notificaciones por categoría, Tribu—
  pero la paridad SIEMPRE debe quedar en 0). Solo quedan en su forma original marcas y acrónimos
  internacionales que NO se traducen: `Neuromundi`, `EVS`, `Google Calendar`, `1 USD =`, `MRI` y los
  nombres de redes (`Instagram`, `TikTok`, `Facebook`, `ADHD`, `WhatsApp`). Al añadir claves nuevas,
  tradúcelas también a he/ar/ko (y respeta RTL en cualquier UI nueva).
  **REGLA DE MARCA "Neurocamps" (antes "Tribu/Tribe")**: el módulo social ahora se llama
  **"Neurocamps"** (marca acuñada, IGUAL en los 11 idiomas, tratada como nombre propio; el espacio
  individual es "Neurocamp"). Rename hecho en 0087/i18n reemplazando el token de marca de VALOR
  `\bTribu\b`/`\bTribe\b` → `Neurocamps` (las CLAVES i18n y las tablas/RPC internas siguen siendo
  `tribe_*` / `nav.tribe` / `adm.tribe.*`: NO se renombraron para no romper referencias). Cada
  **Neurocamp corresponde a una sección** (`tribe_forums/tribe_events/tribe_mentors.section`,
  0087): el usuario elige el Neurocamp con un selector (usa `sectionStore`) y los foros se filtran
  por sección (`tribe_forums_list(...,p_section)`, `tribe_create_forum(...,p_section)`). **Eventos y
  mentoría también filtran/crean por sección** (0088: `tribe_events_list`/`tribe_create_event`,
  `tribe_mentors_list`/`tribe_become_mentor`/`tribe_my_mentor` con `p_section`; el selector de la
  página propaga la sección a `EventsSection`/`MentorshipSection` vía `useSection`).
  El LOGO de Neurocamps es único (marca igual en los 11 idiomas): `public/tribu/neurocamps-v6.webp`
  (`tribeLogo()` ya NO depende del idioma). El logo global de Neuromundi está en `public/logo-header.png`
  + `logo-neuromundi.webp` + iconos PWA/favicon/OG, todos generados/optimizados desde los PNG de la raíz.
  **OJO — hay DOS fuentes de texto FUERA del i18n, una por idioma (no las olvides al
  añadir un idioma):** (1) el **Kit / "Herramientas"** en `src/data/toolkitContent/content.<lang>.ts`
  (registrado en su `index.ts`, con `he`/`ar`/`ko` ya creados y traducidos); (2) el contenido
  **legal + Manifiesto** en `src/data/legal<Xx>.ts` (registrado en `legalContent.ts` →
  `LEGAL_CONTENT`, con `legalHe`/`legalAr`/`legalKo` ya creados). Ambos caen a inglés si falta el
  idioma. Los 9 PDF del Kit por idioma (`public/kit/{he,ar,ko}/*.pdf`) YA existen. Los de he/ar
  van maquetados RTL y se regeneran con `scripts/gen_kit_pdfs.py` (reportlab + arabic-reshaper +
  python-bidi, fuente DejaVu Sans que cubre he y ar); los de ko (LTR) con
  `scripts/gen_kit_pdfs_ko.py` (reportlab con la fuente CID `HYGothic-Medium`, que trae reportlab).
  **HERRAMIENTAS POR SECCIÓN (antes "Kit")**: la sección `/kit` (+ alias `/herramientas`,
  `nav.kit`="Herramientas") alberga un kit por cada una de las 3 secciones. `getModules(lang, section)`
  y `getModule(lang, section, id)` (`toolkitContent/index.ts`) reciben `section` =
  `neurodivergencias` (kit original, 11 idiomas) | `neurodesarrollo` (`nd.<lang>.ts`) | `afecciones`
  (`af.<lang>.ts`). La página `Toolkit` tiene un selector de sección (usa `sectionStore`) y el
  progreso se prefija por sección (`${section}:${id}`, salvo neurodivergencias que conserva ids
  sueltos). Iconos de módulo nuevos en `types.ts`/`meta.ts` (`sprout`,`blocks`,`activity`,`pulse`).
  Los kits `nd` (`nd.<lang>.ts`) y `af` (`af.<lang>.ts`) ya están en los **11 idiomas** (misma
  estructura de módulos A–E e ids de sección que la base) y sus **PDF de recurso** ya existen
  (`public/kit/{nd,af}/<lang>/*.pdf`, 110 archivos = 5 por módulo × 2 kits × 11 idiomas). Se
  generan con `node scripts/dump_kit_content.mjs` (vuelca el contenido a `scripts/kit_content.json`)
  seguido de `python3 scripts/gen_new_kit_pdfs.py` (reportlab; DejaVu para latín, reshaping+bidi
  para ar/he RTL, fuentes CID `HeiseiKakuGo-W5`/`STSong-Light`/`HYGothic-Medium` para ja/zh/ko).
  **Rendimiento del i18n**: `initI18n` NO espera el diccionario completo (~150 KB) para montar;
  carga primero el chunk CRÍTICO `src/i18n/critical/{lang}.crit.json` (~9 KB: solo los namespaces
  de la portada — encabezado/home/pie/intro, lista en `scripts/gen_i18n_critical.mjs`), monta, y
  fusiona el diccionario completo en segundo plano. Los `.crit.json` se REGENERAN en cada
  `npm run build`/`dev` (van en sincronía con los locales; no los edites a mano). El plugin de
  precarga en `vite.config.ts` precarga el chunk `.crit` (no el completo). Si añades un namespace
  que se pinte en el primer render de la portada, agrégalo a `CRITICAL` en el generador.
- Supabase (Auth, Postgres+RLS, Storage, Edge Functions) — `src/lib/supabase.ts`
- Alias de import: `@` → `src`
- PWA con `vite-plugin-pwa` (manifest + service worker; requiere HTTPS real)
- Push nativo Web Push/VAPID (`public/push-sw.js` + Edge Function `send-push`)

## Comandos
```
npm run dev            # desarrollo (genera antes los chunks i18n críticos)
npm run build          # gen i18n críticos + tsc -b + vite build (verificación de tipos)
npm run build:prerender# OPT-IN: build + react-snap (prerenderiza la portada). Requiere
                       #   `npm i -D react-snap` (descarga Chromium). NO fatal: si falla,
                       #   sale con éxito y te quedas con la SPA normal. Verifica la portada.
npm run test           # vitest
npm run typecheck      # tsc --noEmit
```
La verificación que NO debe fallar antes de entregar: `npm run build`.

## Reglas críticas (no romper)

### 1. i18n con paridad total
- Las cadenas visibles usan `t('clave')`. Las claves viven en `src/i18n/locales/*.json`.
- **Toda clave nueva debe existir en los 10 idiomas.** La paridad debe ser exacta (0).
- Verifica la paridad tras cualquier cambio de textos:
```
python3 - <<'PY'
import json,glob
L=['es','en','fr','de','it','pt','ja','zh','ar','he']
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
  migraciones en su flujo). Última en el repo: **0089** (0089 ya aplicada en producción vía el
  conector Supabase; `create-membership-checkout` v29 desplegada).
- Para verificar qué está aplicado en producción: `db/verificar_produccion.sql` (histórico hasta
  0022), `db/verificar_produccion_0077_0088.sql` (tramo reciente; las RPC que solo cambian de firma
  se comprueban por nº de argumentos) y `db/verificar_cron.sql` (cron esperados + activos).

### 3. Escribir a otros usuarios / notificaciones
- Tabla `notifications` (user_id, type, title, body, data jsonb, is_read). RLS = solo
  leer/actualizar lo propio. **Para notificar a OTRO usuario se usa una función
  `SECURITY DEFINER`** (bypassa RLS) acotada por `is_admin()` o por `auth.uid()`.
- Ejemplos: `admin_send_message`, `request_appointment`, `respond_appointment`,
  `emit_*_appointment_reminders`, `send_message`, `waitlist_notify_slot`.
- La campana (`NotificationsBell`) renderiza por `type`. Tipos vigentes: `post_achievement`,
  `badge`, `appt_*`, `admin_message`, `direct_message`, `booking_request`, `waitlist_slot`,
  `waitlist_join`, `campaign`, `commission_paid`, `directory_match`, `suspension_reminder`
  (aviso al usuario de eliminación próxima), `account_costo` (aviso al admin de cancelación
  por costo). **Al añadir un tipo, añade su icono y sus claves i18n.**
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
  fees (cuotas por país + carga/descarga CSV + **códigos promocionales**), referrals (programa de
  recomendación), donations, **founders** (curación del muro de fundadores por país, 0065),
  **badges** (distintivos descargables por tipo de miembro: subir/bajar archivos, 0066),
  **tribe** (moderación de Tribu Neuromundi: foros, moderadores y suspensiones totales/parciales,
  0070/0072), **accounts** (bajas/suspensiones: estadística + ID/correo, sin aprobación),
  **improve** (sugerencias del público "Ayúdanos a mejorar"), other.
  Roles válidos por constraint: `parent | provider | admin`. `provider_type` admite
  `service_provider | merchant | school | clinic | wellness | tourism | legal | ngo | caregiver | company`
  (**company** = "Empresas", nuevo en 0066; **tourism** se reetiqueta en la UI como
  "Esparcimiento" sin cambiar el valor en base).
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
- **Alta social = formulario RICO por tipo (modo "completar")**: quien entra por login
  social no trae tipo ni datos. `SocialOnboarding` primero hace elegir el tipo; si es
  PRESTADOR (especialista/comercio/escuela) monta el MISMO formulario dedicado
  (`SpecialistRegister`/`ProviderRegister`/`SchoolRegister`) con la prop `complete`, que
  oculta email/contraseña (la cuenta ya existe) y, en vez de `signUp`, llama a
  `authStore.completeProfile(input)` — un UPDATE tipado (`TablesUpdate<'profiles'>`) del
  perfil propio con TODOS los campos (cédula, especialidades, áreas, modalidades, etc.).
  Los CONSUMIDORES (paciente/familia) usan `RegisterForm` con la misma prop `complete`
  (trae su propio panel de beneficios); en modo completar rellena email/contraseña con
  valores de relleno válidos —ocultos— para que el esquema no bloquee, y llama a
  `completeProfile`. `completeProfile` fija el rol durante el alta gracias a 0061 (el
  trigger lo permite mientras `rules_version_accepted IS NULL`). Si añades un campo al
  formulario dedicado, mapea su columna también en `completeProfile`.
- **El trigger `protect_profile_columns` revierte `role` en TODO UPDATE de no-admin**:
  es la protección anti-escalada (`NEW.role := OLD.role`). Ojo: también intercepta los
  UPDATE de funciones `SECURITY DEFINER` como `complete_onboarding`, porque `auth.uid()`
  sigue siendo el usuario, no el dueño de la función. Eso rompía el alta social (fijaba
  `provider_type` pero el rol volvía a 'parent'). Desde 0061 el trigger permite fijar el rol
  UNA vez, mientras `OLD.rules_version_accepted IS NULL` (onboarding inicial), y lo bloquea
  después. El alta por correo no se veía afectada porque fija el rol en el INSERT
  (`handle_new_user`), que este trigger BEFORE UPDATE no toca. Si añades una RPC que deba
  tocar `role`/`is_verified`, recuerda este candado.
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
- **Héroe estático inyectado: PROBADO Y RETIRADO (no reintentar por esta vía).** Se probó
  inyectar en `#root`, con un script en línea, una réplica del pliegue superior con la 1.ª
  imagen del héroe para pintar el LCP antes de que React monte. **No funciona con `createRoot`**:
  al montar, React REEMPLAZA `#root`, destruye ese `<img>` y crea uno nuevo, así que el LCP se
  vuelve a medir en el pintado de React (el desglose LCP mostraba `element render delay ~1,9 s`
  con el `<img>` de HeroCarousel, no el estático) y encima el "pinta→borra→repinta" degradaba el
  Speed Index. La ÚNICA forma de que un héroe en el HTML mejore el LCP es la **hidratación**
  (`hydrateRoot`), que exige DOM que coincida con el árbol de React → eso es el **prerender**
  (`npm run build:prerender` con react-snap; `main.tsx` ya hidrata si el `#root` viene sin
  `data-nm-shell`). El LCP de la portada está por tanto acotado por el primer pintado de React.
- **Los modales del layout van con `lazy`**: `AppLayout` monta ~12 emergentes (AuthModals,
  SocialOnboarding, GuidedTour…). Importarlos de forma estática mete react-hook-form, zod
  y `mxStatesMunicipalities` (43 KB) en el bundle inicial aunque no se vean. Si añades un
  modal al layout, añádelo con `lazy` + `<Suspense fallback={null}>` y condicionado.
- **UI no crítica aplazada con `deferUi`**: el banner de registro suave y el botón flotante
  de soporte estaban SIEMPRE montados, así que sus chunks entraban en la cadena crítica del
  LCP (se veían como nodos `SoftSignupBanner`/`SupportButton` en el árbol de red). Se montan
  tras `requestIdleCallback` (estado `deferUi`). Si añades UI que no se ve en el primer
  pintado, gátala igual. El mismo patrón está extraído en el hook **`useIdleReady()`**
  (`src/hooks/useIdleReady.ts`): devuelve `false` en el primer pintado y `true` al quedar el
  navegador ocioso. **En `Home`** `AlliesGrid` y `ContentCarousel` ya NO usan `useIdleReady`:
  se cargan con **`lazy` + `Suspense`** y se montan solo cuando su sección entra al viewport
  vía **`useInView()`** (`src/hooks/useInView.ts`, IntersectionObserver, `rootMargin` 300px).
  Así su código sale del bundle inicial (`index-*.js`) Y sus consultas a Supabase (allies /
  content_posts) salen por completo de la ruta crítica del LCP (Lighthouse no hace scroll, así
  que ni se piden). Si añades a la portada un componente debajo del pliegue que consulta la
  base, hazlo `lazy` + gátalo con `useInView` (o `useIdleReady` si no quieres esperar al scroll).
  El **selector de país de la portada** usa `SearchableSelect` (no un `<select>` con ~250
  `<option>`): no pinta las opciones hasta abrirse, quitando ese coste de "Style & Layout" del
  primer render. La ruta `/reservar/:memberNo` (`Book`) también es `lazy` (fuera del bundle inicial).
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
- **Catálogos de registro/búsqueda** en `src/data` (`specialistCatalog`, `clinicCatalog`,
  `providerCatalog`, `kCatalog`, `storeCatalog`, `blogTopics`): el `label` es el RESPALDO en
  español; la **localización a los 8 idiomas** se hace por i18n con la clave `cat.<value>`
  (helper `useCatLabel()` en `src/lib/catLabel.ts`, que hace `t('cat.'+value, { defaultValue: label })`).
  **REQUISITO: toda entrada nueva de cualquier catálogo debe llevar su `cat.<value>` en los 8
  locales** (plataforma de alcance global; si falta, cae al español y rompe la UX). Ya están
  localizados: profesiones, especialidades, áreas, modalidades, certificaciones… NO —`CERTIFICATIONS`
  son nombres propios internacionales (ADOS-2, PECS, TEACCH…) y se dejan igual—, `TITLE_PREFIXES`
  (SÍ se traducen con el equivalente más cercano por idioma: Dr./Dra./Lic./Mtro…), catálogos de
  clínica (imagenología/laboratorio), temas del blog, y la Tienda (`STORE_CATEGORIES` con
  subcategorías `sub[]`, incluidas **Arte** y **Artesanía**). La **guía de hitos** vive en i18n
  bajo `milestones.<banda>.<area>` y `roleFeatures` bajo `roleFeatures.<tipo>`. Se amplió con el
  dominio **Arte, Música y Expresión (neuroafirmativo)**: nuevas profesiones (danzaterapia,
  profesor de música adaptada, coach de teatro, mentor de artistas…), áreas (expresión creativa,
  movimiento/danza…) y la categoría de producto `arte_musica`. Los *chips* de filtro del directorio
  son la tabla DB `categories` (curada, aparte).
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
| `/inclusion-laboral` | `LaborInclusion` | pública; oportunidades (empleo/voluntariado/servicio social) con buscador por país y tipo (RPC `public_jobs`). Las publican Empresas y ONG desde su panel |
| `/red` | `RedNeuromundi` | pública; portal de aliados de la Neuromundi ID (cómo escanear/validar, beneficios, sellos descargables para prestadores). Sellos SVG→PNG en `NeuromundiSeal` |
| `/pregunta-al-experto` | `AskExpert` | |
| `/crear-cuenta` · `/entrar` | `CreateAccount` · `Auth` | |
| `/lista/:token` | `SharedList` | pública por token |
| `/terminos` `/privacidad` `/proteccion-datos` `/reglamento` `/manifiesto` `/conocer-mas` | legales | |
| **`/panel`** | `Dashboard` | **protegida**; renderiza `AdminDashboard`, `ProviderDashboard` o `ParentDashboard` según rol |
| **`/ajustes`** | `Settings` | **protegida** |
| **`/calendario`** | `Calendar` | **protegida** |
| **`/mensajes`** | `Messages` | **protegida**; mensajería directa |
| **`/mi-id`** | `MyId` | **protegida**; Neuromundi ID a pantalla + destino del `shortcut` del PWA. Abre OFFLINE (QR client-side + cache `localStorage 'neuro.id.card'`) |
| `/tribu` | `TribuNeuromundi` | **pública** (el landing explica e invita a crear cuenta/entrar); el hub —foros, mentoría, eventos— exige sesión + membresía dentro del propio componente. Módulo "Tribe/Tribu" (F1–F5) |
| `/donar` | `Donate` | pública; donación con o sin cuenta (`DonationSection`) |
| `/donantes` | `DonorWall` | pública; muro de donantes (`donor_wall()`) |
| `/fundadores` | `Founders` | pública; muro de Miembros Fundadores curado por país (`founders_wall`), 0065 |
| `/beneficios` | `Benefits` | pública; beneficios de la campaña por tipo de perfil (destino del popup de bienvenida) |
| **`/curso-bienvenida`** | `WelcomeCourse` | **protegida**; curso virtual de bienvenida (video + módulos + CTA al grupo privado si el admin puso `community_url`) |
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
- **Mensajería**: `useMessages` (hilos, envío, no leídos). En el compositor, TODOS los usuarios
  tienen un buscador por folio/nombre/apellido (RPC `search_contacts`, 0058) + campo de folio
  manual. `search_contacts` devuelve tus contactos y, si eres profesional/admin, también a los
  profesionales publicados. El envío (`send_message`): admin a cualquiera; profesional↔profesional
  libre; si interviene un consumidor, solo con relación previa (no hay contacto en frío hacia
  familias/pacientes). El admin conserva `search_members` (todo el padrón) en su propia búsqueda.
- **Lista de espera / campañas**: `useWaitlist`, `useCampaigns` (en `useWaitlist.ts`)
- **Notificaciones**: `useNotifications` (campana) · **PWA**: `usePwaInstall`
- **Push nativo**: `usePushSubscribe` (permiso + suscripción)

### Componentes clave (`src/components`)
- `layout/AppLayout` — navegación, pie, popups globales, disparo de recordatorios
- `layout/AccessibilityMenu` — Modo calma, dislexia, contraste, tamaño de texto
- `admin/AdminDashboard` — + `AdminMetrics`, `AdminMessages`, `AdminReports`, `AdminRenewals`, `AdminBilling`, `AdminProducts`, `AdminOtherValues`, `AdminFees` (+ `FeesCsvPanel`), `AdminReferrals`, `AdminFounders` (muro de fundadores), `AdminMemberBadges` (distintivos por tipo), `AdminTribe` (foros/moderadores/suspensiones de Tribu)
- **Inclusión laboral** (Fase A/B): `pages/LaborInclusion` (oportunidades) · `pages/CompanyRegister` ("Empresas", `provider_type='company'`) · `pages/EsparcimientoRegister` (turismo reetiquetado, con lat/long + horarios de bajo impacto sensorial) · `provider/JobsPanel` (CRUD de vacantes) · `provider/MemberBadgesCard` (descarga de distintivos) · `directory/EsparcimientoInfo`
- **Tribu Neuromundi** (`src/components/tribe/*` + `pages/TribuNeuromundi`): `JoinTribeModal`, `EnergyBadge`, `TribeLevelCard`, `GiveGratitudeModal`, `ForumRoom`, `ModeratorsSection`/`ApplyModeratorModal`/`RateModeratorModal`, `MentorshipSection`/`BecomeMentorModal`/`MentorThread`, `EventsSection`/`CreateEventModal`/`SensoryReportModal`. Datos: `hooks/useTribe`, `useTribeMentorship`, `useTribeEvents`; niveles en `lib/tribeLevels`/`tribeModLevels`, insignias en `data/tribeBadges`
- `membership/TopicSubscriptions` (avisos por categoría, 0069) · `directory/ProviderReviewModal` (reseña directa, 0068)
- `membership/AccountInactiveModal` · `membership/AccountReactivatedModal` — portero de cuota
- `donation/DonationSection` (embudo `/donar`) · `donation/AlliesGrid` (grid de logos, reemplazó al carrusel; máx 30, altura acotada) · `founder/FoundersWallSection` (`/fundadores`) · `admin/AdminDonations`
  (estadística + curación del muro + CRUD de aliados + **importes por moneda**) · página `DonorWall` (`/donantes`)
- `directory/DirectorySearch` — filtros del directorio. Se quitaron los *chips* de la
  tabla `categories` (redundantes con la taxonomía nueva). Ahora: `directory/SearchableSelect`
  (typeahead para especialidad/área), filtros plegables en móvil ("Filtros (N)"), y accesos
  rápidos por dominio (Terapias, Animales/TAA, Perinatal, Educación/F. Ejecutivas, **Arte y
  Música**, Productos) vía el filtro `anyOf` de `useDirectory` (cruza profesión + especialidades
  + áreas + categorías de producto). El `DOMAINS` con los valores canónicos vive en
  `DirectorySearch.tsx`. Además un toggle **"Neuroafirmativo"** filtra por `profiles.neuroaffirming`
  (sello 0060 que otorga el admin). El perfil público muestra un panel "Perfil neuroafirmativo"
  con las 3 dimensiones de reseña que lo sustentan (adaptación sensorial, flexibilidad, trato
  humano) desde `public_provider_ratings`, y el sello violeta junto al verificado.
- `calendar/AppointmentRequests` · `report/ReportModal` + `report/MyReports` · `shop/ProductReviewsModal`
- `provider/BookingWidgetPanel` (widget embebible) · `provider/WaitlistPanel` · `provider/CampaignsPanel`
- `merchant/AffiliatePanel` (código y enlace propios) + `merchant/CommissionsPanel`
  (libro "me deben / yo debo", marcar liquidación, estado de cuenta CSV)
- `onboarding/GuidedTour` — guía de bienvenida **por rol** (`useAuth().isProvider`): la
  familia/paciente ve directorio · kit · academy · eventos · seguridad · app; el prestador
  ve directorio · agenda · mensajería · métricas · seguridad · app. Pasos comunes en ambos.
  `safeStep = Math.min(step, last)` acota el índice si el rol se resuelve tras el primer
  render. Si cambias los pasos de un rol, añade sus claves `tour.*.{title,body}` en los 8
  idiomas · `pwa/InstallAppButton` · `ui/*` (`Button`, `Modal`, `PasswordInput`, `StarRating`…)
- `toolkit/ContinueLearning` — "continuar donde me quedé" del Kit; lee `useToolkitProgress`,
  enlaza al siguiente módulo sin leer (`/kit?m=<id>`). Montado en `ParentDashboard`.
- `provider/SchoolInclusionPanel` (editor del programa de inclusión, escuelas/clínicas; guarda
  en `provider_details` jsonb) · `directory/SchoolInclusionInfo` (muestra programa/admisiones/grados
  en el perfil público)
- `clinical/MilestoneGuide` (guía de hitos por edad, datos en `src/data/milestonesGuide.ts`,
  orientación NO diagnóstico; botón "registrar" alimenta el rastreador local `MilestoneTracker`)
- `provider/AliadoCertificateCard` — cuando el distintivo llega a nivel `aliado` (o
  `embajador`), ofrece descargar el reconocimiento "Aliado Destacado" en PDF tamaño carta.
  Lo genera `src/lib/aliadoCertificate.ts` SIN dependencias: abre un HTML `@page size:letter`
  y lanza imprimir→guardar como PDF (texto localizado desde la UI). El distintivo lo habilita
  solo el sistema de badge; esto es únicamente el diploma. Montado en la pestaña "Mis
  Calificaciones" del `ProviderDashboard`.
- `layout/ImproveModal` + `admin/AdminImprovements` — "Ayúdanos a mejorar" (migración 0057):
  botón público en el pie junto a "Denuncia"; envía por `submit_improvement` (anónimo o con
  sesión); el admin lee en la sección "Mejoras".
- `membership/AccountFlowModal` (baja/suspensión guiada) · `membership/SuspendedAccountModal`
  (aviso de reactivación al entrar) · `admin/AdminAccountActions` (estadística de bajas).

### RPC principales (todas `SECURITY DEFINER`)
- **Admin**: `admin_metrics`, `admin_reports`, `admin_send_message`, `admin_membership_renewals`, `admin_set_verified/published`
- **Citas**: `request_appointment`, `respond_appointment`, `emit_due_appointment_reminders`, `emit_all_due_appointment_reminders`, `search_patients`
- **Fundador/referidos**: `claim_founder_slot` (fija `grace_until` = 3 meses), `set_founder_optout`,
  `purge_lapsed_founders` (cron diario `nm-purge-lapsed-founders`: revoca el distintivo si al
  vencer los 3 meses NO se cumplen requisitos OBJETIVOS —foto+bio+teléfono y, si es prestador,
  cuota cubierta—; los blandos como foro/blog/recomendaciones NO revocan), `set_referrer`,
  `my_referral_count`. El distintivo se AUTO-reclama (`useFounderAutoClaim`) al entrar quien
  califica y no optó por salir; al reclamarse por primera vez dispara `FounderCongratsPopup`
  (aviso de los 3 meses). El popup público de invitación (`FounderPopup`) es solo informativo
  (lista única de beneficios + recuadro que remite a los requisitos del formulario de registro).
- **Mensajería**: `send_message` (**0058**: permitido si eres admin, si AMBOS son profesionales
  (`role='provider'`: especialistas/comercios/escuelas, libre entre sí), o si YA existe relación
  cuando interviene un consumidor —hilo previo, cita `appointment_requests`, pedido `orders` o
  descuento `discount_transactions`—; NO hay contacto en frío hacia familias/pacientes),
  `message_threads` (resumen de hilos),
  `search_contacts` (**0058**: busca TUS contactos por folio/nombre/apellido, para todos los
  usuarios), `search_members` (búsqueda admin de TODO el padrón, solo `is_admin`),
  `search_patients` (búsqueda acotada del especialista)
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
- **Ciclo de vida de cuenta** (0056): `suspend_my_account` (6 meses, oculta el perfil
  guardando `pre_suspend_published`), `reactivate_my_account`, `cancel_my_account(reason,
  detail)` (registra motivo; 'costo' → retención 24 h + `notify_admins`, NO borra; otros →
  el cliente llama a la Edge Function `delete-account`), `admin_account_actions` (estadística,
  is_admin). Cron: `emit_suspension_reminders` (semanal, últimos 31 días) y
  `purge_expired_suspensions` (borra auth.users a los 6 meses). Helper `notify_admins`
  (revocado a clientes). El aviso de reactivación se muestra en `AppLayout` con
  `SuspendedAccountModal` cuando `profiles.suspended_at` está puesto.
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
  `send-support`, `send-product-rejection`, `campaign-emails` (bienvenida +
  recordatorios de la campaña por Resend desde `admin@neuromundi.com`; cron cada 2h)
- **Mantenimiento**: `purge-expired-files`, `delete-account`
- **Neuromundi ID (Wallet): RETIRADO.** Se probó el andamiaje `wallet-pass` (Apple `.pkpass`
  + Google JWT) y se decidió NO usarlo (mucho mantenimiento: cuenta Apple de pago, certificados
  WWDR G4, alta de emisor Google). En su lugar la Neuromundi ID es 100% PWA: página `/mi-id`
  (protegida, también el `shortcuts` del manifest) que abre OFFLINE (QR client-side + cache local
  del ID en `localStorage 'neuro.id.card'`), y descarga de la credencial en PDF vía impresión
  (`src/lib/idCredential.ts`, sin dependencias). Si algún día se reconsidera Wallet, revisar el
  historial de git; NO reintroducir sin resolver antes el mantenimiento de certificados.
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
ojo con las monedas sin decimales: JPY no se divide entre 100) ·
`aliadoCertificate` / `idCredential` (documentos descargables vía impresión→PDF, SIN dependencias:
abren un HTML con `@page` y lanzan `window.print()`; `idCredential` embebe el QR como dataURL).
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
| 0056 | Ciclo de vida de cuenta: suspensión 6m, retención por 'costo', bitácora `account_actions`, estadística admin, cron recordatorio+purga |
| 0057 | "Ayúdanos a mejorar": `improvement_suggestions` + `submit_improvement` (público) + `admin_improvement_suggestions` |
| 0058 | Mensajería por relación previa: `send_message` solo si hay contacto (hilo/cita/pedido/descuento) o admin; `search_contacts` (busca tus contactos por nombre/folio) |
| 0059 | Subcategoría de producto en la Tienda (`products.store_subcategory`) |
| 0060 | Sello Neuroafirmativo: `profiles.neuroaffirming` + `admin_set_neuroaffirming` (lo otorga el admin; filtro en directorio y sello en el perfil) |
| 0061 | Arregla el onboarding social: `protect_profile_columns` revertía el rol a 'parent' (dejaba `provider_type`); ahora permite fijarlo durante el alta + repara filas rotas |
| 0062 | Fundador condicional: `founder_members.grace_until` (3 meses) + `purge_lapsed_founders` (revoca por requisitos objetivos: foto+bio+teléfono, y cuota cubierta si es prestador) + cron diario |
| 0063 | Métrica admin `incomplete_registrations` (perfiles con `rules_version_accepted IS NULL`) en `admin_metrics()` |
| 0064 | Aliados por país: `allies.countries text[]` (NULL/vacío = todos). El carrusel del home filtra por el país del selector; admin lo edita en Donaciones → Aliados |
| 0065 | Muro de fundadores curado por país: `founder_members.wall_published/wall_featured/wall_order` + RPC `founders_wall`/`founders_wall_countries` (público) y `admin_founders`/`admin_set_founder_wall` (admin). Página `/fundadores` |
| 0066 | Inclusión laboral: `provider_type='company'`; tabla `job_openings` (todos los campos opcionales, RLS: activas públicas) + `public_jobs`/`public_jobs_countries`; tabla `member_badges` + bucket público `badges` (distintivos por tipo de miembro que el admin sube/baja) |
| 0067 | `job_openings.opportunity_type` (employment/volunteering/social_service); `public_jobs(p_country,p_type)` |
| 0068 | Reseñas abiertas: `satisfaction_surveys.transaction_id` NULLABLE + índice único parcial; `can_review_provider` y `submit_provider_review` (reseñar tras cita/pedido/canje, no solo descuento) |
| 0069 | Notificaciones por categoría (opt-in): `topic_subscriptions` (temas + país/ciudad) + triggers `notify_topic_job`/`notify_topic_venue` (tipos `topic_job`/`topic_venue`) |
| 0070 | **Tribu Neuromundi F1**: `tribe_members` (energía/privacidad/reglas), `tribe_forums` (con aprobación admin), `tribe_forum_members`, `tribe_forum_invites`, `tribe_messages`; RPCs de listar/moderar; `is_tribe_active()` |
| 0071 | **Tribu F2** (gratitud): `tribe_members.points/silent_mode`; `tribe_gratitude` (historial privado); `tribe_give_gratitude` con anti-spam (5 fichas/día, enfriamiento de par 24h, decaimiento, antigüedad 48h, anónimo); `tribe_impact`/`tribe_tokens_left`/`tribe_set_silent` |
| 0072 | **Tribu F3** (moderadores): `tribe_members.can_write/can_evaluate/can_review` (suspensión parcial); `tribe_moderators` (postulación+ética+puntos), `tribe_mod_ratings` (5 dimensiones); RPCs de postular/listar/calificar/aprobar; `admin_set_tribe_member` (suspensión total/parcial). Recrea el candado de escribir/evaluar |
| 0073 | **Tribu F4** (mentoría): `tribe_mentors` (vías nd_youth/family_family), `tribe_mentorships`, `tribe_mentor_messages` (hilo 1:1 asíncrono); RPCs de ofrecerse/listar/solicitar/responder/mensajes |
| 0074 | **Tribu F5** (eventos): `tribe_events` (guía de anticipación OBLIGATORIA: qué pasará, ruido, sala de calma), `tribe_event_rsvps`, `tribe_event_sensory`; `tribe_create_event` (+20), `tribe_event_sensory_report` (+15), RSVP y listado |
| 0075 | **Neuromundi ID** (Fase 1): `profiles.accepts_neuromundi_id` (opt-in del prestador → leyenda "Acepto Neuromundi ID" en su perfil); `resolve_parent_by_qr` ahora devuelve rol/folio/estado para la pantalla de validación. Tarjeta `NeuromundiIdCard` (anverso/reverso, colores por rol, folio, QR, vigencia). Sin Wallet nativo: PWA offline (`/mi-id` + shortcut) + descarga en PDF |
| 0076 | **Fundador de Empresas + empresa gratuita**: grupo de fundador `companies` (cupo **20/país**, requisito objetivo = **≥2 vacantes activas** en `claim_founder_slot` y `purge_lapsed_founders`); `founder_capacity('companies')=20`. Empresa inclusiva SIEMPRE gratis: backfill `membership_status='exempt'` + trigger `trg_company_membership_free`. Front: `founderKindFor(company)→'companies'`, `FOUNDER_CAPACITY.companies=20`, gate exime a `company`, requisito `vacancies` en `founderRequirements` |
| 0077 | **Códigos promocionales con descuento** (además de la exención total previa): `promo_codes.benefit` (`exempt`/`percent`) + `percent_off` (1–100). `redeem_promo_code` ramifica: `exempt` marca `membership_status='exempt'` (como antes); `percent` guarda el código en `profiles.promo_code_used` SIN exentar y devuelve `{benefit,percent_off}`. Nueva RPC `membership_promo_pct(user)` que lee el % activo; el checkout (`create-membership-checkout`) lo combina de forma **compuesta** con el descuento de recomendación y acota al 90%. UI admin en `AdminPromoCodes` (selector beneficio + campo %); `MembershipModal` muestra "descuento aplicado" y deja pagar |
| 0078 | **Promo de monto fijo + candado por correo**: `promo_codes.benefit` admite `amount` (con `amount_off` + `amount_currency`) y `bound_email` (si está puesto, `redeem_promo_code` exige que el correo de la cuenta coincida → error `email`). `membership_promo_pct` se reemplaza por `membership_promo(user)` (devuelve benefit/percent_off/amount_off/amount_currency). El checkout aplica cupón de **monto** (solo si la moneda coincide con la de cobro; no apila con recomendación por límite de Stripe de 1 cupón) o de **%** (compuesto con recomendación). UI admin: opción "Monto fijo" + moneda + campo "ligar a correo" |
| 0084 | **Campaña (Fase 5): boletos de sorteo**: tabla `raffle_tickets` (source `signup`/`referral`, únicos por usuario y por par referente-referido). Triggers: `trg_raffle_signup` (1 boleto al registrarse si la campaña está activa) y `trg_raffle_referral` (1 boleto al referente por cada fila de `referrals`). RPCs: `my_raffle_tickets()` (panel de recomendación) y `admin_raffle_entries()` (lista para el sorteo, solo admin → CSV en `AdminCampaign`). El sorteo (elegir ganadores) es manual el día del lanzamiento con esa lista |
| 0086 | **Tres secciones (fundación)**: `profiles.sections text[]` (backfill de prestadores existentes a neurodesarrollo+neurodivergencias) + `profiles.neuro_conditions text[]` + índices GIN. `handle_new_user` ampliado (lee `sections`/`neuro_conditions` del alta por correo). Front: `src/data/sections.ts`, `sectionStore`, `neuroConditionsCatalog.ts`, filtro `section`/`neuroCondition` en `useDirectory`, selector de sección + chips en el directorio, `SectionsField` en los registros de prestador |
| 0090 | **Rendimiento RLS + índices duplicados (rescatada del otro chat, ya aplicada en prod)**: envuelve `auth.uid()/role()/jwt()` en `(select …)` en las políticas RLS (InitPlan: 1 evaluación por consulta en vez de por fila; recomendación de Supabase) y elimina 2 pares de índices idénticos (`idx_posts_keywords`, `idx_courses_author`). Idempotente (ALTER POLICY en bucle + `drop index if exists`). Respaldo en `public._rls_backup_20260902`. **Nota**: escribe `(select auth.uid())` en políticas futuras o reaparece el aviso `auth_rls_initplan` |
| 0089 | **Cuota ONG + descuentos por país + búsqueda difusa + boost fundadores + WhatsApp**: afiliado `'ngo'` (CHECK de `membership_fees` + `affiliate_type_for` devuelve `'ngo'` para provider_type ngo; base editable → fluye a `admin_country_prices`). Tabla `country_discounts` (país→%, activo) + `country_discount_pct`/`admin_country_discounts`/`admin_set_country_discount`; el checkout compone el % por país con recomendación/promo/fundador (tope 90%). `search_all` recreada con **pg_trgm** (`similarity`/`%`, tolera erratas; `search_path=public, extensions`) + boost `is_founder` (+0.6). `campaign_config.whatsapp_url` + `admin_set_whatsapp_url` (botón en el pie). `founder_provider_ids()` público → el directorio pone fundadores primero + sello. **Bug corregido** en `create-membership-checkout`: `discountPct` estaba en `const` dentro del `else` y se usaba fuera (ReferenceError); ahora `let` en el ámbito exterior |
| 0088 | **Neurocamps por sección — eventos y mentoría**: `tribe_create_event`/`tribe_events_list` con `p_section` (+ devuelve `section`); `tribe_become_mentor`/`tribe_my_mentor`/`tribe_mentors_list` con `p_section`. `EventsSection`/`MentorshipSection` leen `useSection` y propagan el Neurocamp elegido; selector de sección en `CreateEventModal` y `BecomeMentorModal` |
| 0087 | **Neurocamps (antes Tribu) por sección**: `tribe_forums/tribe_events/tribe_mentors.section` (check a los 3 valores o NULL) + índices; `tribe_forums_list` recreada con `p_section` (+ devuelve `section`); `tribe_create_forum` recreada con `p_section`. Rename de marca Tribu/Tribe → Neurocamps en los 11 idiomas (solo valores). Ruta `/neurocamps` (alias de `/tribu`). Selector de Neurocamp en la página + sección al crear foro |
| 0085 | **Campaña (Fase 6): comunidad + curso + sorteo ponderado**: `campaign_config.community_url` (grupo privado Discord/WhatsApp) + `admin_set_campaign_community(p_url)`. Tabla `raffle_winners` + `admin_raffle_draw(p_count,p_role,p_batch)` (muestreo ponderado por nº de boletos con `power(random(),1.0/tickets)` —Efraimidis-Spirakis—, filtro de rol `consumer`/`paying`/null, inserta ganadores y los devuelve) + `admin_raffle_winners()`. Front: página **`/curso-bienvenida`** (`WelcomeCourse`, protegida: video `public/curso-bienvenida.{webm,mp4}` + módulos i18n + CTA de comunidad), CTA de comunidad en `/beneficios`, y en `AdminCampaign` el campo de URL de comunidad + UI de sorteo (rol + cantidad → sortear, lista de ganadores, CSV) |
| 0083 | **Campaña (Fase 4): emails con Resend**: tabla `campaign_emails` (welcome_sent_at/last_reminder_at) + trigger `trg_enroll_campaign_email` (alta al registrarse SI la campaña está activa). RPCs (solo `service_role`): `campaign_welcome_queue`, `campaign_reminder_queue` (perfiles de pago sin cuota, cada 5 días, % vigente, antes de la apertura del país), `campaign_email_sent`. Cron `nm-campaign-emails` (cada 2h) → Edge Function **`campaign-emails`** (Resend, remitente `admin@neuromundi.com` vía `CAMPAIGN_FROM`; deploy `--no-verify-jwt`). Bienvenida = recompensa por tipo de perfil + fecha de apertura; recordatorio = % de descuento vigente. PENDIENTE: referidos/sorteo, curso al confirmar correo |
| 0082 | **Campaña (Fase 2): descuento de fundador por etapa en Stripe**: `campaign_config.founder_discount` jsonb (`[{"days":15,"pct":50},{"days":30,"pct":25}]`). `admin_campaign_set` recreada con `p_founder_discount` (drop del 6-args previo). `create-membership-checkout` calcula el % según días desde `start_at` **solo para el periodo anual** y lo combina de forma compuesta con recomendación+promo (tope 90%). Front: `useCampaign.founderDiscount`/`founderDiscountNow()` (etapa vigente + fecha de corte), aviso en `MembershipModal`, editor de etapas en `AdminCampaign` |
| 0081 | **Campaña de pre-registro (Fase 1)**: tabla `campaign_config` (fila única id=1): `active`, `start_at`, `default_block_days` (90), `block_days_by_country` jsonb ({"México":30}), `popup_active`, `popup_continents` jsonb. RPC pública `campaign_status()` + `admin_campaign_set(...)` (admin). Front: `useCampaign`/`useDirectoryLock` (admin+asesor EXENTOS), `DirectoryGate` envuelve `/directorio` `/buscar` `/proveedor/:id` → `DirectoryLockedScreen` (fondo oscuro + cuenta regresiva naranja hasta la apertura del país). Mapa país→continente en `src/data/continents.ts`. Con la campaña activa se apagan `FounderPopup` y `SoftSignupBanner`. Panel `AdminCampaign` (sección "Campaña"). Semilla: activa, inicio 2026-08-10T06:00Z (00:00 CDMX). **Fase 3** (front, sin migración): `CampaignWelcomePopup` (2 secciones: "Ver video" → `public/welcome-neuromundi.{webm,mp4}` que sube el equipo, "Conocer beneficios" → `/beneficios`) montado en `AppLayout` tras el intro, gateado por `popupActiveFor(continente)`, una vez por sesión (sessionStorage `neuro.campaignPopup`), y SUPRIME el tour cuando la campaña está activa. `MembershipSuccessNotice` (aviso de congelación vitalicia en `/panel?membership=ok&period=annual`). PENDIENTE: referidos/sorteo, curso al confirmar correo, emails Resend |
| 0080 | **Foros de Tribu ampliados**: `tribe_forums.notify_countries` (países a los que llega el aviso) + estado `closed`. Nuevas tablas `tribe_forum_prefs` (push de foros + países de interés del usuario) y `tribe_forum_moderators` (postulación de moderador POR foro). RPCs: `tribe_create_forum` (crea + notifica al creador `forum_pending` con reglas/ética + autopostulación si es moderador aprobado), `admin_set_forum_status` recreada (al aprobar avisa a la comunidad `forum_new` por país respetando `tribe_forum_prefs`; avisa al creador `forum_approved`), `tribe_close_forum` (moderador del foro o admin/asesor), `tribe_forum_call_moderators` (convocatoria → `forum_mod_call`), `tribe_apply_forum_moderator`, `admin_forum_moderators`/`admin_set_forum_moderator` (`forum_mod_approved`), `tribe_forum_prefs_get/set`, `tribe_am_i_forum_moderator`. `notif_category` clasifica los tipos `forum_*` en "comunidad". Front: `CreateForumForm` (multiselección de países + aviso reglas/ética + checkbox postular), `TribeForumsPanel` en dashboards (foros vigentes + toggle push + países), `ForumRoom` (cerrar/postular), `AdminTribe` gana "Postulaciones" + convocar/cerrar, `NotificationsBell` tipos `forum_*` |
| 0079 | **Perfil Asesor** (explorador + moderador de Tribu): `profiles.is_advisor` (privilegio, blindado en `protect_profile_columns`); helpers `is_advisor()` / `is_admin_or_advisor()`. La moderación de Tribu (`admin_tribe_forums`, `admin_set_forum_status`, `admin_tribe_moderators`, `admin_set_moderator_status`, `admin_set_tribe_member`, `admin_tribe_member_lookup`) se abre a `is_admin_or_advisor()`. `tribe_forum_messages` deja leer cualquier foro a admin/asesor + `tribe_delete_message`. Asignación por folio: `admin_set_advisor(member_no,bool)` / `admin_list_advisors` (solo admin). Front: `useAuth.isAdvisor`, gate exime al asesor, `Dashboard`→`AdminDashboard advisor` (**solo Tribu**, sin métricas), `AdminAdvisors` (asignar), `AdminTribe` gana el área "Mensajes" (visor + borrado) |

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
  **grid** de aliados en el home (`AlliesGrid`, tabla `allies`; reemplazó al carrusel/marquee:
  cuadrícula estática de máx 30 logos con altura acotada para no empujar el pie; filtra por país),
  y sección **Donaciones** en el panel admin
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
- **CI/CD por GitHub Actions** (`.github/workflows/deploy.yml`): cada push a `main` (o
  `workflow_dispatch` manual) compila y **sube `dist/` a Hostinger por FTP**
  (`SamKirkland/FTP-Deploy-Action`, sincronización incremental, con reintento por si
  Hostinger corta la conexión). Pasos: checkout → `setup-node` con `.nvmrc` (**Node 22**) →
  `npm ci` → `npx tsc --noEmit` → `npx vitest run` → `npm run build` → comprueba
  `dist/.htaccess` → sube. Secrets a configurar UNA vez en GitHub → Settings → Secrets →
  Actions: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CARTO_KEY` (públicas),
  `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` (credenciales reales). El CI es el veredicto:
  si tsc o vitest fallan, NO despliega. Aún hay que **purgar la caché del CDN** a mano.
- **`VITE_CARTO_KEY`**: desde ago-2026 CARTO exige API key para sus basemaps; sin ella el
  mapa del directorio sale con marca de agua "API KEY REQUIRED" (no se rompe). `MapView.tsx`
  la lee de esa variable; va en la URL del tile (pública por naturaleza; CARTO la protege por
  dominio). Documentada en `.env.example`. Gratis hasta 5M req/mes.
- El frontend vive en **Hostinger** (Apache). Se confirma con `curl -sI https://www.neuromundi.com`
  → cabecera `Server: hcdn`. **No es Netlify ni Vercel**: `netlify.toml`, `vercel.json` y
  `public/_redirects` son restos sin efecto. Lo que manda es **`public/.htaccess`**
  (HTTPS, ruteo SPA, compresión y caché).
- Tras cada despliegue hay que **purgar la caché del CDN** en hPanel; si no, los archivos
  con nombre estable (video, héroe) siguen sirviéndose viejos.
- **Dominio canónico = `www.neuromundi.com`**: el `.htaccess` redirige el apex
  `neuromundi.com` → `www` (301, acotado al apex exacto para no tocar `admin.*`). CLAVE
  para el login social: con PKCE, el `code_verifier` de Supabase vive en el `localStorage`
  del host donde inicia el login y debe leerse en el MISMO host; si el usuario saltara entre
  apex y www a mitad del flujo, la sesión no se crea. El Site URL de Supabase también es `www`.
- **OAuth social (Azure/Google/LinkedIn)** — dos trampas ya resueltas, recordar si se
  reconfigura: (1) el URI de redirección en el proveedor debe ser el **callback de Supabase**
  (`https://<ref>.supabase.co/auth/v1/callback`) bajo plataforma **Web**, NO "SPA" (SPA exige
  PKCE cross-origin y Supabase canjea con secret → error `invalid_request: Proof Key...`).
  (2) El *Secret Value* (no el Secret ID) y, para apps de un solo inquilino, la Azure Tenant
  URL `https://login.microsoftonline.com/<tenant>`. Los errores de OAuth se ven ahora en la
  app: `AppLayout` lee `error_description` del hash/URL al volver y lo muestra en un toast.
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
