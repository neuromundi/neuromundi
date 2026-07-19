# NeuroDirectorio — Base del proyecto

Fundamento de la PWA: cliente Supabase tipado, tipos, stores, hooks de negocio y
primitivos de UI accesibles. Todo en TypeScript estricto, sin `any` explícitos.

## Estado verificado

- `npm run typecheck` → sin errores (modo estricto).
- `npm run build` → build de producción + service worker PWA.
- `npm run test` → 10/10 pruebas (Vitest + Testing Library).

## Cómo correrlo

```bash
npm install
cp .env.example .env   # completa tus claves de Supabase
npm run dev
```

## Qué incluye esta capa

```
src/
├── types/
│   ├── database.ts   # tipos del esquema (regenerables con supabase gen types)
│   └── app.ts        # tipos de dominio + metadatos de dimensiones del EVS
├── lib/
│   ├── supabase.ts   # cliente tipado (solo anon key, protegido por RLS)
│   └── utils.ts      # cn, color EVS, debounce, WebP, logger condicional
├── stores/
│   └── authStore.ts  # Zustand: sesión + perfil + acciones de auth
├── hooks/
│   ├── useAuth.ts          # sesión y rol
│   ├── useProfile.ts       # perfil, avatar, rotación de qr_token, categorías
│   ├── useOffers.ts        # CRUD de ofertas con updates optimistas
│   ├── useTransactions.ts  # validación de QR + canje + historial
│   └── useRealtime.ts      # suscripción genérica + pendientes del padre
├── components/ui/
│   ├── Button.tsx        StarRating.tsx   EVSBadge.tsx
│   ├── ProgressBar.tsx   Modal.tsx        Toast.tsx
│   └── SkeletonCard.tsx
├── AppProviders.tsx  # inicializa sesión + ToastProvider
└── main.tsx          # shell (el router se conecta en la fase de páginas)
```

## Siguiente fase sugerida

Con la base + el flujo del padre listos, el siguiente bloque natural es el **flujo
del proveedor** (escáner QR + CRUD de ofertas) o el **directorio público**.

## Internacionalización (i18n)

La app usa `react-i18next`. Regla de arranque exacta del requisito:

- Navegador en español → **español**.
- Cualquier otro idioma del navegador → **inglés**.

Idiomas seleccionables manualmente (selector en el header y en Ajustes):
Español, English, Français, Deutsch, Italiano, Português, 日本語, 中文. La
elección se recuerda en `localStorage`. Las fechas se formatean según el locale
activo (`Intl`, mapeo en `src/i18n/index.ts`).

```
src/i18n/index.ts                       # config + regla es/en + currentLocale()
src/i18n/locales/{es,en,fr,de,it,pt,ja,zh}.json   # catálogos
src/components/layout/LanguageSwitcher.tsx
```

La regla de detección está cubierta por pruebas (`src/i18n/i18n.test.ts`).

### Estado de la traducción

**La app está internacionalizada al 100% en los 8 idiomas.** Toda la interfaz
navegable usa claves i18n: shell/navegación, portada, registro/login, ajustes,
directorio y tarjetas, perfil de proveedor, paneles de padre/proveedor/admin,
encuesta EVS, recetas y marketplace, networking de proveedores y listas de
padres, además de las primitivas de UI (modal, toasts, pestañas, skeletons) y el
generador de QR. Los mensajes de validación (Zod) viven como claves y se traducen
al renderizar. Las fechas y números se formatean según el locale activo.

Convenciones aplicadas en todo el código:
- Etiquetas de dimensión y de ayuda vía `DIMENSION_LABEL_KEY` / `DIMENSION_HELP_KEY`.
- Texto de descuento vía `discountLabel(t, …)`.
- Estados (ofertas, transacciones, recetas) mapeados a claves, no a literales.

> Nota: las traducciones de japonés y chino se proporcionan completas, pero
> conviene una revisión por hablante nativo antes de producción.

## Estado: app completa

Router, navegación por rol, autenticación, páginas y **panel de admin** están
cableados. Todos los flujos del spec original están cubiertos, más el marketplace
de recetas. Build con code-splitting por ruta.

### Orden para aplicar el SQL en Supabase

> Ejecuta los archivos **en este orden** en el SQL Editor de Supabase. El
> primero crea todo el esquema base; el resto se apoya en él.

1. `db/00-base-schema.sql` — **esquema base (la "PARTE 1")**: tablas `profiles`,
   `categories`, `provider_categories`, `offers`, `discount_transactions`,
   `satisfaction_surveys`; la vista de calificaciones `public_provider_ratings`
   (EVS); RLS base (incluidas las **lecturas por identidad** de transacciones y
   encuestas, válidas para padres y pacientes); el trigger de alta de usuario
   (`handle_new_user`), el de completar la transacción al enviar encuesta
   (`complete_transaction_on_survey`), el contador de canjes y `handle_updated_at`;
   más una semilla de categorías. Crea el `CHECK` `profiles_role_check` que la
   migración de pacientes amplía después.
2. `db/prescriptions.sql` — marketplace de recetas + `resolve_parent_by_qr`.
3. `db/policies.sql` — **migración consolidada** con todas las correcciones que se
   fueron señalando y el rol admin. Es idempotente (`DROP ... IF EXISTS`).
4. `db/networking.sql` — conexiones entre proveedores + listas de padres/pacientes.
5. `db/patients-and-locations.sql` — **rol `patient`**, datos de registro ampliados
   y sucursales del proveedor (ver más abajo). Idempotente.
6. `db/widen-consumer-policies.sql` — amplía a **consumidores (paciente + padre)**
   el RPC `resolve_parent_by_qr` (escaneo de QR para descuentos y recetas) y el
   destinatario permitido en `presc_insert_therapist`. Idempotente.
7. `db/membership.sql` — **cuota de afiliación**: columnas de membresía en
   `profiles`, tablas de configuración `membership_fees` (cuota base por tipo, en
   USD) y `country_pricing` (moneda + tipo de cambio por país), `promo_codes` /
   `promo_redemptions`, helpers (`is_member_active`, `redeem_promo_code`,
   `get_membership_quote`, `expire_membership_grace`) y la **restricción de los 7
   días** (perfil no visible ni interactivo si no paga tras la gracia). Idempotente.

> **Sobre las políticas de lectura (SELECT) que preguntabas:** ahora viven en
> `db/00-base-schema.sql` y son **por identidad** (`parent_id = auth.uid()` para el
> consumidor, `provider_id = auth.uid()` para el proveedor). Al no filtrar por rol,
> funcionan igual para padres y pacientes sin cambios adicionales.

`db/policies.sql` reúne, en un solo archivo:
- Políticas faltantes de `provider_categories` (lectura pública + escritura del dueño).
- Bloqueo de auto-escaneo en `transactions_insert_provider` + `CHECK` de respaldo.
- Política de encuestas corregida (sin el `NOT EXISTS` ambiguo; el `UNIQUE` cubre duplicados).
- `expire_stale_transactions` con `search_path` fijo.
- `offers_select_for_my_transactions` (historial del padre).
- Vista `public_provider_comments` (comentarios sin datos del padre).
- Rol admin: `is_admin()`, política de lectura total de perfiles, y RPCs
  `admin_set_verified` / `admin_set_published`.

`db/patients-and-locations.sql` aporta:
- Amplía el `CHECK` de `profiles.role` a `IN ('patient','parent','provider','admin')`
  y agrega el helper `is_consumer()` (paciente o padre).
- Nuevas columnas de perfil: `birth_date`, `gender`, `condition`
  (neurodivergencia/padecimiento), `state`, `municipality`, `is_company`,
  `services_offered`.
- Tabla `provider_locations` (sucursales) con dirección, coordenadas, teléfono y
  horarios por sucursal, más su RLS (lectura pública si el perfil está publicado;
  escritura solo del proveedor dueño).
- `handle_new_user` ampliado: crea el perfil leyendo **todos** los metadatos del
  registro.
- Amplía a consumidores lo que controlamos: `resolve_parent_by_qr` ahora acepta
  pacientes y las listas usan `is_consumer()`.

> **Estado de los pacientes como consumidores:** la **inserción** de canjes y
> encuestas ya es por identidad (`parent_id = auth.uid()`) en `db/policies.sql`,
> así que funciona para pacientes sin cambios. El escaneo del QR y el destinatario
> de recetas se amplían en `db/widen-consumer-policies.sql`. Lo único por
> **verificar** son las políticas de **lectura** (`SELECT`) de transacciones/encuestas
> de tu PARTE 1: si incluyen un filtro `role = 'parent'`, ese archivo trae la consulta
> de diagnóstico y la plantilla para ampliarlas (la mayoría son por identidad y no
> requieren cambio).

### Tipos de usuario y registro

Hay **cuatro tipos** de afiliación, elegibles al registrarse:

- **Paciente** (`role = 'patient'`): nombre completo, fecha de nacimiento, tipo de
  neurodivergencia/padecimiento, país, estado/provincia, municipalidad/alcaldía y
  correo (obligatorios); teléfono y género (opcionales).
- **Padre/madre o tutor** (`role = 'parent'`): igual que paciente, pero la
  neurodivergencia/padecimiento es la del hijo/a.
- **Prestador de servicios** (`role = 'provider'`, `provider_type = 'service_provider'`):
  nombre completo o razón social (según persona física/empresa), fecha de nacimiento
  (si es persona física), servicio(s) que ofrece, país/estado/municipalidad, correo,
  y **una o más sucursales** con calle y número, teléfono y horarios (coordenadas
  opcionales) para el mapa.
- **Proveedor de productos** (`role = 'provider'`, `provider_type = 'merchant'`):
  igual que el prestador, pero con producto(s) que ofrece.

Paciente y padre comparten el panel de consumidor (QR, descuentos, encuesta,
recetas y listas). Los datos nuevos también se pueden completar/editar luego en
**Ajustes**, que ahora incluye una sección **"Mis sucursales"** (solo proveedores)
para agregar, editar y eliminar ubicaciones después del registro. El **mapa del
directorio** pinta un pin por cada sucursal con coordenadas; si un proveedor no
tiene sucursales geolocalizadas, usa como respaldo la coordenada de su perfil.

Para nombrar al primer admin:
`UPDATE public.profiles SET role = 'admin' WHERE id = '<uuid>';`

### Corrección aplicada en código

`useTransactions.validateQr` ahora valida el QR del padre con la RPC segura
`resolve_parent_by_qr` (antes leía `profiles` directamente, lo que RLS bloquea).
Esto deja funcionando tanto el escaneo de descuentos como el de recetas.

## Fase: Panel de admin (moderación)

```
db/policies.sql                              # rol admin + RLS/RPCs (consolidado)
src/hooks/useAdmin.ts                        # listar y moderar proveedores
src/components/admin/AdminDashboard.tsx      # verificar / publicar proveedores
```

El admin entra por `/panel` (la página `Dashboard` enruta admin → `AdminDashboard`).
Pestañas: **Pendientes** (sin verificar o sin publicar), **Verificados**, **Todos**.
Por proveedor puede verificar/quitar verificación y publicar/despublicar; los
cambios se hacen por RPC acotada (no por una política UPDATE amplia) y se reflejan
de inmediato (optimistas). Por privacidad y seguridad, solo el rol admin puede leer
perfiles no publicados (política `profiles_select_admin` con `is_admin()`, que evita
la recursión de RLS).

## Estado: app navegable de extremo a extremo

Router, navegación por rol, autenticación y páginas están cableados. La PWA es
navegable completa: portada → directorio → perfil → registro/login → panel
(padre o proveedor) → ajustes, con el marketplace de recetas integrado en los
paneles. Build con code-splitting por ruta. Lo único pendiente del spec original
es el panel de **admin** para verificar proveedores.

## Fase: Cableado (router, auth y páginas)

Archivos nuevos:

```
src/App.tsx                                 # rutas (lazy) + guardas
src/main.tsx                                # monta <App/> en AppProviders
src/components/layout/AppLayout.tsx         # header + barra inferior móvil por rol
src/components/layout/ProtectedRoute.tsx    # guarda de rutas con sesión
src/components/auth/LoginForm.tsx           # entrar (RHF + Zod)
src/components/auth/RegisterForm.tsx        # registro con rol (familia/proveedor)
src/hooks/useProviderProfile.ts             # perfil público de un proveedor
src/pages/{Home,Directory,ProviderProfile,Dashboard,Auth,Settings}.tsx
```

Rutas:

| Ruta | Acceso | Contenido |
| --- | --- | --- |
| `/` | público | Portada |
| `/directorio` | público | `DirectorySearch` (lista + mapa) |
| `/proveedor/:id` | público | Perfil con EVS, radar y ofertas |
| `/lista/:token` | público | Lista compartida de un consumidor (`SharedList`) |
| `/terminos` | público | Términos y Condiciones (plantilla base) |
| `/privacidad` | público | Aviso de Privacidad (plantilla base) |
| `/conocer-mas` | público | "Conocer más sobre Neuromundi" (plantilla) |
| `/entrar` | público | Login / registro (redirige si hay sesión) |
| `/panel` | sesión | `Dashboard` → consumidor (padre/paciente) o proveedor según rol |
| `/ajustes` | sesión | `Settings` (perfil, datos personales, negocio, sucursales, zona de peligro) |

> **Páginas legales:** `/terminos` y `/privacidad` traen una **plantilla base**
> editable (en `src/pages/Terms.tsx` y `src/pages/Privacy.tsx`, con un envoltorio
> común en `src/components/legal/`). El registro exige aceptar ambas mediante una
> casilla obligatoria que mantiene deshabilitado el botón "Crear cuenta" hasta
> marcarla. Sustituye los marcadores `[NOMBRE DE LA EMPRESA]`, `[CORREO DE
> CONTACTO]`, etc., y **revisa el texto con asesoría legal** antes de producción.
> El Aviso de Privacidad ya destaca que la neurodivergencia/padecimiento es un dato
> personal sensible y trata el caso de menores (cuentas de padres/tutores).

> **Inicio de la app (onboarding):** al abrir, se muestra un **splash de video**
> (`public/neuromundi.mp4`) con botón **Saltar** (una vez por navegador; si el
> archivo no existe, se cierra solo y no rompe nada). Después, a quien no tiene
> sesión se le ofrece un **modal de acceso** con **Registrarme**, **Iniciar sesión**
> y el enlace **"Conocer más sobre Neuromundi"** (→ página `/conocer-mas`, que a su
> vez enlaza al sitio oficial `https://www.neuromundi.com/info`). "Registrarme" abre
> el formulario con el selector de los 4 tipos (paciente, padre/tutor, prestador de
> servicios, proveedor); "Iniciar sesión" abre el formulario de correo y contraseña.
> La **sesión persiste** (Supabase `persistSession`), así que quien ya inició sesión
> no vuelve a hacerlo. El botón "Entrar" del header y la barra móvil abren este mismo
> modal.
>
> **Soporte técnico:** un **botón flotante "Soporte"** presente en toda la app abre
> un formulario (tipo de solicitud + mensaje). Al enviar, invoca la **Edge Function
> `send-support`** (`supabase/functions/send-support/`), que manda el correo a
> **admin@neuromundi.com** desde el servidor (vía Resend), sin abrir el cliente de
> correo del usuario. Incluye URL, idioma, navegador y —si hay sesión— el correo del
> usuario como `reply_to`. Si la función falla, hay **respaldo automático a `mailto:`**.
>
> Configuración de la función (una vez):
> ```bash
> supabase functions deploy send-support
> supabase secrets set RESEND_API_KEY=re_xxx
> # opcionales (tienen valor por defecto):
> supabase secrets set SUPPORT_TO=admin@neuromundi.com
> supabase secrets set SUPPORT_FROM="Soporte Neuromundi <soporte@neuromundi.com>"
> ```
> El dominio del remitente (`SUPPORT_FROM`) debe estar **verificado en Resend**. Si
> prefieres otro proveedor (SendGrid, etc.), solo cambia la llamada `fetch` dentro de
> la función.

Integraciones de la feature de recetas:

- `ParentDashboard` gana la pestaña **Recetas** (`ParentPrescriptions`).
- `ProviderDashboard` gana una pestaña según el tipo: **Recetar**
  (`PrescriptionBuilder`) para `service_provider`, **Mis Productos**
  (`ProductManager`) para `merchant`.

Rendimiento: las rutas pesadas (mapa con Leaflet, dashboards con Recharts y el
escáner) se cargan con `React.lazy`; el chunk inicial no las incluye.

## Estado: flujos completos

La app cubre el círculo completo **descubrir → canjear → calificar**, más el
**marketplace de recetas** (carrito recetado). Lo que resta es cableado de
páginas/router y la verificación de proveedores (admin).

## Fase: Carrito recetado (marketplace de recetas)

Innovación: el terapeuta (`service_provider`) arma un carrito de productos de
oferentes afiliados (`merchant`) y se lo envía a un padre concreto; el padre lo
recibe y compra **directamente con cada proveedor** (handoff, sin pago en la
plataforma).

Migración SQL: `db/prescriptions.sql` (córrela en Supabase después de la PARTE 1).

```
db/prescriptions.sql                          # products, prescriptions, items, RLS, RPCs
src/lib/schemas.ts                            # + productSchema
src/hooks/useProducts.ts                      # catálogo público + CRUD del merchant
src/hooks/usePrescriptions.ts                 # enviar/listar/detalle/estados + resolver QR
src/components/merchant/ProductManager.tsx    # catálogo del oferente afiliado
src/components/provider/MiniQrScanner.tsx     # escáner de QR de un solo uso (genérico)
src/components/provider/PrescriptionBuilder.tsx  # armado y envío del carrito recetado
src/components/parent/ParentPrescriptions.tsx # bandeja + detalle + compra (handoff)
```

Modelo y reglas:

- **products** pertenece a un merchant; lectura pública de activos; el padre y el
  terapeuta también pueden leer un producto inactivo si aparece en su receta.
- **prescriptions** (estados `draft → sent → viewed → ordered`) la leen las dos
  partes; solo un `service_provider` la crea, dirigida a un `parent` real; el
  padre cambia el estado por RPC (no puede editar el contenido).
- **prescription_items** los edita el terapeuta solo en borrador; un trigger
  congela el precio (`unit_price_snapshot`).

### ⚠️ Hallazgo importante (afecta también al escáner de descuentos)

`profiles_select_published` impide que un proveedor lea el perfil de un padre, así
que validar el QR del padre leyendo `profiles` directamente **no funciona** bajo
RLS. La migración incluye la función `SECURITY DEFINER` `resolve_parent_by_qr`,
que devuelve solo `id` y nombre cuando el token coincide. El armador de recetas ya
la usa; conviene que `useTransactions.validateQr` (flujo de descuentos) también la
use en lugar de la lectura directa de `profiles`.

### Cumplimiento (pagos)

La plataforma **no procesa pagos**: registra la receta/orden para seguimiento y
hace handoff al `purchase_url` del proveedor. Un pago integrado requeriría un
procesador (p. ej. Stripe) y se dejaría como estructura, sin manejar datos de
tarjeta.

### Cómo conectarlo

- Da al merchant una pestaña con `ProductManager` (similar a las del proveedor).
- Da al terapeuta acceso a `PrescriptionBuilder` y al padre a
  `ParentPrescriptions` (idealmente una pestaña nueva en `ParentDashboard`).

## Fase: Directorio público

Archivos nuevos:

```
src/lib/utils.ts                            # + haversineKm, DEFAULT_CENTER (CDMX)
src/hooks/useCategories.ts                  # catálogo de categorías para filtros
src/hooks/useDirectory.ts                   # proveedores publicados + EVS + categorías + filtros
src/components/directory/ProviderCard.tsx   # tarjeta premium con desglose colapsable
src/components/directory/MapView.tsx        # mapa Leaflet + clustering + markers por EVS
src/components/directory/DirectorySearch.tsx# orquestador: filtros + lista + mapa
```

Cómo encaja con el spec 3.4 y 3.5:

- **ProviderCard**: EVS con color dinámico, desglose de dimensiones (barras que se
  animan al entrar en viewport, "ver más"), conteo de reseñas, badge "Nuevo" con
  pocas reseñas, sello de verificado, y acciones "Ver perfil" / "Mapa".
- **MapView**: tiles de Carto Light, clustering, markers SVG cuyo color refleja el
  EVS, popup con mini-ficha, botón "centrar en mi ubicación" (fallback a CDMX) y
  círculo de radio. Es complementario: la lista es la alternativa textual.
- **DirectorySearch**: búsqueda con **debounce de 300ms**, chips de categoría,
  filtro de ciudad y radio (5/10/25/50 km, activo al ubicarte). Lista y mapa se
  sincronizan por `selectedId`; en móvil se alternan, en escritorio van lado a lado.

### RLS que habilita el directorio

Funciona para usuarios anónimos porque `profiles_select_published` permite leer
perfiles publicados sin sesión, `public_provider_ratings` está concedida a `anon`
y `categories` es de lectura abierta. Recuerda la política de la base para
`provider_categories` (lectura pública); sin ella, las categorías no aparecen en
las tarjetas ni en los filtros.

### Rendimiento

Leaflet/markercluster añaden peso. Igual que el escáner y las gráficas del
proveedor, conviene cargar `MapView` con `React.lazy` para no inflar el bundle.

## Fase: Flujo del proveedor

Archivos nuevos:

```
src/lib/schemas.ts                         # + offerSchema (validación condicional)
src/lib/utils.ts                           # + exportToCsv
src/hooks/useProviderRatings.ts            # EVS propio, radar, comparativa, comentarios
src/components/provider/OfferForm.tsx      # alta/edición con RHF + Zod y vista previa
src/components/provider/QRScanner.tsx      # escaneo html5-qrcode + aplicar descuento
src/components/provider/ProviderDashboard.tsx  # 4 pestañas
```

Cómo encaja con el spec 3.2:

- **Mis Ofertas**: lista con chip de estado y barra "X de Y usos"; alta/edición en
  modal con `OfferForm` (validación Zod, vista previa de cómo la ve el padre);
  activar/pausar (optimista), editar y eliminar con confirmación.
- **Escanear QR**: pide cámara solo al iniciar; decodifica `{ parentId, qrToken }`,
  valida contra Supabase, bloquea el auto-escaneo, deja elegir oferta activa, crea
  la transacción `pending`, muestra éxito con confeti ligero y apaga la cámara.
- **Historial**: tabla paginada (10/pág) con filtros por estado y oferta, y
  exportación a CSV en cliente.
- **Mis Calificaciones**: EVS propio, radar (Recharts) de las dimensiones,
  comparativa contra el promedio de la categoría y comentarios recientes.

### Privacidad del historial

El proveedor **no** ve la identidad de las familias: las políticas RLS impiden
leer perfiles de padres y el historial omite cualquier dato personal, cumpliendo
la restricción crítica del spec.

### Vista opcional para comentarios

`useProviderRatings` lee los comentarios desde una vista que expone solo el texto
y la fecha, sin datos del padre. Créala para habilitar esa sección (degrada con
gracia si falta):

```sql
CREATE OR REPLACE VIEW public.public_provider_comments AS
SELECT
  s.provider_id,
  s.comments,
  s.created_at,
  ROUND(
    (s.quality_score + s.human_treatment_score + s.accessibility_score +
     s.price_value_score + s.offer_compliance_score +
     s.sensory_adaptation_score + s.flexibility_crisis_score)::NUMERIC / 7, 1
  ) AS overall
FROM public.satisfaction_surveys s
WHERE s.comments IS NOT NULL AND length(trim(s.comments)) > 0;

GRANT SELECT ON public.public_provider_comments TO anon, authenticated;
```

### Rendimiento

`QRScanner` (html5-qrcode) y `RatingsTab` (recharts) son pesados. En producción
conviene cargarlos con `React.lazy` por pestaña para no inflar el bundle inicial.

## Fase: Flujo del padre

Archivos nuevos:

```
src/lib/schemas.ts                       # Zod: encuesta condicional por tipo de proveedor
src/hooks/useSurvey.ts                   # contexto del canje + envío + EVS actualizado
src/hooks/useParentDiscounts.ts          # historial enriquecido (oferta + proveedor)
src/components/ui/Tabs.tsx               # pestañas accesibles (reusables por el proveedor)
src/components/parent/QRGenerator.tsx    # QR descargable + rotación de token
src/components/parent/SurveyModal.tsx    # encuesta no-cancelable con cuenta regresiva
src/components/parent/ParentDashboard.tsx# pestañas + listener realtime + cola de encuestas
```

Cómo encaja con el spec 3.3:

- **Mi QR**: codifica `{ parentId, qrToken }`, descarga PNG, regenera token con
  confirmación e instrucciones en 3 pasos.
- **Realtime**: `ParentDashboard` mantiene el canal activo y además recupera al
  entrar las transacciones `pending` que llegaron mientras el padre no estaba,
  procesándolas en cola.
- **Encuesta**: modal NO cancelable con temporizador de 10 min; estrellas por
  dimensión con ícono y descripción; oculta instalaciones/profesionalismo para
  `merchant`; comentario opcional con contador; toggle anónimo (default activado);
  al enviar, el trigger completa la transacción y se muestra el EVS actualizado.
- **Mis Descuentos / Historial**: tarjetas con badge "Ya calificado / Pendiente /
  Expiró".

### ⚠️ Política RLS requerida para el historial

Para que el padre vea el título de ofertas que ya no están `active` (pausadas o
expiradas) en su historial, agrega esta política (las SELECT se combinan con OR):

```sql
CREATE POLICY "offers_select_for_my_transactions"
  ON public.offers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.discount_transactions dt
      WHERE dt.offer_id = offers.id AND dt.parent_id = auth.uid()
    )
  );
```

Sin ella, el flujo funciona pero el título de esas ofertas cae a `null` y la
tarjeta muestra el texto del descuento como respaldo.

## Decisiones de seguridad y accesibilidad

- El cliente nunca recibe la `service_role` key; toda autorización vive en RLS.
- `regenerateQrToken` y los QR usan `crypto.randomUUID()` (no secuencial).
- `useTransactions.createFromScan` bloquea el auto-escaneo en cliente, además del
  CHECK y la política RLS sugeridos para la base de datos.
- `useRealtime` siempre se desuscribe en el cleanup del efecto.
- Áreas táctiles ≥44px, foco visible, `prefers-reduced-motion` y
  `prefers-contrast: more` respetados; mensajes de error en tono positivo.

## Siguiente fase sugerida

Con esta base, el siguiente bloque natural es el **flujo del padre** (QR +
encuesta realtime), que ya tiene listos sus cimientos: `useParentPendingTransactions`,
`Modal` no-cancelable, `StarRating` y los metadatos de dimensiones en `app.ts`.

## Nota sobre `deleteAccount`

El borrado de `auth.users` requiere `service_role` y por eso no se hace desde el
cliente: `useProfile.deleteAccount` invoca una Edge Function `delete-account` que
deberás crear en Supabase. El resto de la lógica ya está cableada.

## Despliegue a producción

El repo incluye configuración lista para SPA con Vite + React Router:

- `vercel.json` — framework Vite, rewrite de todas las rutas a `/index.html` y cache de assets con hash.
- `netlify.toml` — build, Node 20 y redirect SPA (`/* → /index.html 200`).
- `public/_redirects` — fallback SPA (sirve también para Cloudflare Pages).
- `.nvmrc` — Node 20.

En cualquiera de las tres plataformas, define las variables de entorno
`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en el panel del proyecto.

Checklist de producción (resumen):
1. Crear proyecto Supabase; ejecutar los 6 SQL de `db/` en orden.
2. Crear el bucket público `avatars` en Storage.
3. Desplegar las Edge Functions `delete-account` y `send-support`; configurar `RESEND_API_KEY` (y verificar el dominio del remitente en Resend).
4. Colocar el video en `public/neuromundi.mp4`.
5. Sustituir el contenido de plantilla en `/terminos` y `/privacidad` por el texto legal definitivo.
6. Definir `VITE_*` en el host y desplegar el front (`npm run build` → `dist`).
7. Poner la URL final del sitio en Supabase → Auth (Site URL / Redirect URLs).

## Membresía / cuota de afiliación

- **A quién**: a los cuatro tipos (paciente, padre, prestador, proveedor), con
  **cuota variable por tipo** (`membership_fees`, en USD) y **suscripción anual**.
- **Precio por país**: el importe local sale de `base_usd × fx_per_usd` según
  `country_pricing` (moneda + tipo de cambio, editable por el admin en Supabase).
  Hay una fila `default` (USD) de respaldo. El front muestra la cotización con
  `get_membership_quote`.
- **Regla de 7 días**: al registrarse, el estado es `pending` con
  `membership_due_at = now()+7d`. Dentro de la gracia el perfil funciona; pasada
  sin pago, `is_member_active` lo vuelve inactivo (no aparece en el directorio ni
  puede interactuar). Hay un **banner** que recuerda los días restantes y abre el
  modal de pago.
- **Stripe**: el modal de cuota abre **Stripe Checkout** (suscripción anual) vía la
  Edge Function `create-membership-checkout`; el `stripe-webhook` actualiza el
  estado a `active`/`past_due` y la fecha de renovación.
  ```bash
  supabase functions deploy create-membership-checkout
  supabase functions deploy stripe-webhook --no-verify-jwt
  supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
  supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
  ```
  En Stripe → Webhooks, apunta a `https://<ref>.functions.supabase.co/stripe-webhook`
  con los eventos `checkout.session.completed`, `invoice.paid`,
  `invoice.payment_failed`, `customer.subscription.deleted`.
- **Códigos promocionales** (`promo_codes`): el modal acepta un código que **exenta
  el pago** (`redeem_promo_code`). Hay uno **universal** sembrado para consumidores
  (`NEUROMUNDI-FAMILIA`, scope `consumer`) y puedes crear **personales** para socios.
  El admin gestiona todo desde la app: **Panel de admin → Facturación** permite editar
  las cuotas por tipo, los precios por país (moneda + tipo de cambio) y crear /
  activar / eliminar códigos promocionales (sin SQL). El registro vía SQL sigue
  disponible como alternativa:
  ```sql
  INSERT INTO public.promo_codes (code, kind, scope, max_uses, note)
  VALUES ('SOCIO-ABC123', 'personal', 'all', 1, 'Socio invitado');
  ```
- **Selector de lada internacional**: el registro incluye el directorio de códigos
  telefónicos por país (`src/data/dialCodes.ts`) junto al teléfono.

## Fase 1 — Familias gratis, redes/cédula y reglamento

Migración: **`db/phase1.sql`** (aplícala como **8º** archivo, después de `membership.sql`). Idempotente.

- **Familias gratis:** pacientes y padres quedan `membership_status = 'exempt'` al registrarse (no pagan cuota; el cobro sigue aplicando a prestadores y proveedores). El registro muestra un **aviso motivacional de gratuidad** al elegir tipo paciente/padre, y su flujo **omite** el modal de cuota.
- **Redes y sitio web:** profesionales y proveedores capturan `website`, `instagram`, `tiktok`, `facebook` (campos opcionales en el registro; columnas nuevas en `profiles`).
- **Cédula profesional:** si el proveedor/profesional indica país **México**, aparece el campo `cedula_profesional`.
- **Reglamento + descargo:** nueva página **`/reglamento`** (`src/pages/Rules.tsx`) con reglamento por tipo de usuario y un **descargo de responsabilidad** que deslinda a Neuromundi. Su **aceptación es obligatoria** (segunda casilla en el registro, junto a Términos/Privacidad) y el botón "Crear cuenta" permanece deshabilitado hasta marcarla. La aceptación se **registra en Supabase** en la tabla `public.user_agreements` (`user_id`, `user_type`, `doc_version`, `accepted_at`) vía `handle_new_user`, usando la versión de `src/lib/legal.ts` (`RULES_VERSION`). Al cambiar el texto legal, sube esa versión para exigir re-aceptación.

> Los textos del reglamento/descargo son **plantilla base**: revísalos con un abogado antes de producción.

## Fase 2 — Agenda, lista de espera y recordatorios

Migración: **`db/phase2.sql`** (9º archivo, después de `phase1.sql`). Idempotente. Edge Function: `supabase/functions/send-reminders`.

- **Disponibilidad y reserva:** el prestador de servicios define su disponibilidad semanal (día, horario, minutos por cita) en **Panel → Agenda**. Los consumidores ven los **horarios libres** (generados en el cliente a partir de la disponibilidad menos las citas ocupadas) y **agendan** desde el perfil del prestador ("Agendar cita"). Cada cita tiene un campo **"Enlace de videollamada"** que el prestador rellena con su Zoom/Meet.
- **Lista de espera con aprobación del médico:** si no hay hueco, el consumidor se une a la **lista de espera**. Cuando se libera un espacio, el prestador, desde su Agenda, **asigna** el hueco a un paciente en espera; la cita (y por tanto el aviso al paciente) se crea **solo tras la confirmación del prestador**. Nunca se notifica al paciente antes.
- **Recordatorios 24 h y 4 h:** al crear una cita, un trigger encola recordatorios por **correo y WhatsApp**. La Edge Function `send-reminders` los procesa (programa un cron cada ~10 min). Está **lista para llaves**: usa Resend (correo) y Twilio (WhatsApp); si falta el secreto de un canal, ese recordatorio se marca `skipped`.
  ```bash
  supabase functions deploy send-reminders --no-verify-jwt
  supabase secrets set RESEND_API_KEY=re_xxx
  supabase secrets set TWILIO_ACCOUNT_SID=AC... TWILIO_AUTH_TOKEN=... TWILIO_WHATSAPP_FROM="whatsapp:+1415..."
  ```
- **Calendario:** desde "Mis citas" el consumidor puede **descargar .ics** o **añadir a Google Calendar** (MVP de sincronización; la sync bidireccional real con Google/Apple queda como mejora futura).
- **Mis citas:** los consumidores ven, cancelan y exportan sus citas en **Panel → Mis citas**.

## Fase 3 — Pagos con Stripe Connect

Migración: **`db/phase3.sql`** (10º archivo, después de `phase2.sql`). Idempotente.
Edge Functions: `connect-onboarding`, `create-consultation-checkout`; el webhook `stripe-webhook` se amplió para pagos de consulta/terapia y `account.updated`.

- **Stripe Connect (Express):** el prestador conecta su cuenta en **Panel → Pagos → "Conectar pagos"** (`connect-onboarding`). Registra su CLABE en la ventana de Stripe; la app nunca ve datos bancarios. Recibe el **100%** del cobro vía *destination charges*.
- **Pago de consulta:** desde **Mis citas**, el consumidor pulsa **"Pagar consulta"** (`create-consultation-checkout`, modo `payment`). El cobro se deposita en la cuenta conectada del prestador. El estado se confirma por webhook (`checkout.session.completed`).
- **Suscripción de terapia:** misma función con `kind: 'therapy'` (modo `subscription`, mensual).
- **Reporte diario con RFC:** en **Panel → Pagos**, el prestador ve "Tuviste N consulta(s) pagada(s)" con el **RFC del pagador** para que su contador facture (`daily_billing_report`), exportable a **CSV**. El consumidor captura su **RFC** en **Ajustes**.
- **Precio:** el prestador define `consultation_amount` + `consultation_currency` y si **acepta pagos** en el mismo panel.

```bash
supabase functions deploy connect-onboarding
supabase functions deploy create-consultation-checkout
supabase functions deploy stripe-webhook --no-verify-jwt
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx STRIPE_WEBHOOK_SECRET=whsec_xxx
```
En Stripe → Webhooks, añade también los eventos `account.updated` (Connect). Habilita **Stripe Connect** en tu cuenta de plataforma.

## Fase 4 — Contenido (blogs/reels), valoraciones y buscador

Migración: **`db/phase4.sql`** (11º archivo, después de `phase3.sql`). Idempotente.

- **Blogs y enlaces:** el prestador crea contenido en **Panel → Contenido**: un **blog** (artículo dentro de la app) o un **enlace** a un reel/red social (se abre en pestaña nueva). Cada publicación lleva **palabras clave** para el buscador y puede publicarse/despublicarse.
- **Carrusel en inicio:** las publicaciones publicadas aparecen en un **carrusel** en Home; el blog abre el lector interno (`/contenido/:id`) y el enlace abre externo.
- **Valoración por estrellas:** pacientes y padres califican (1–5). La calificación **solo se muestra cuando el promedio llega a 3**. Cada visita queda registrada (para el informe).
- **Felicitación por logro:** al alcanzar **≥ 3 estrellas**, un trigger crea una **notificación in-app** para el autor con un **informe de cuántas personas consultaron** la publicación y un mensaje para seguir publicando. Se ve en la **campana** del header (con contador de no leídas).
- **Comentarios:** los blogs admiten comentarios.
- **Buscador global:** `/buscar` (icono en el header y barra inferior) encuentra **contenido, prestadores y productos** por palabras clave vía la RPC `search_all`.

No requiere Edge Functions nuevas ni secretos.

## Fase 5 — Clínico (expediente, tareas, chat, reportes) + cifrado E2E

Migración: **`db/phase5.sql`** (12º archivo, después de `phase4.sql`). Idempotente. Crea el bucket privado `secure` y sus políticas.
Edge Function: `purge-expired-files` (autoborrado de archivos vencidos).

> **Aviso:** no es un expediente clínico certificado. Cumplimiento (NOM-024 MX, HIPAA, GDPR) requiere revisión legal y de seguridad.

- **Consentimiento:** la familia otorga/revoca acceso a su expediente por especialista (desde sus favoritos). Sin consentimiento activo, el especialista no ve nada (RLS con `has_clinical_access`).
- **Expediente multidisciplinario:** notas y **reportes mensuales** que la familia y los especialistas con acceso pueden consultar.
- **Tareas/ejercicios en casa:** el especialista asigna; la familia marca **"Completado"**.
- **Chat asíncrono:** mensajería familia ↔ especialista (con consentimiento), pensada para respuestas según horarios.
- **Intercambio de archivos E2E:** cifrado **de extremo a extremo** con Web Crypto (RSA-OAEP + AES-GCM). El archivo se cifra en el navegador; el servidor solo guarda el **cifrado** y las llaves AES **envueltas** por destinatario. **Autoborrado** por `expires_at` vía `purge-expired-files` (cron). La **llave privada** vive solo en el dispositivo (IndexedDB); el usuario puede exportarla como respaldo. No hay recuperación en servidor (rompería el E2E).
- **Rastreador de hitos local-first:** vive solo en el navegador (IndexedDB), nunca en la nube; se puede **imprimir/guardar PDF** y exportar JSON.

Texto clínico estructurado (notas, tareas, chat, reportes): protegido por **RLS + cifrado en reposo/tránsito** de Supabase (no E2E, porque debe consultarse entre roles). Solo el **intercambio de archivos** es E2E.

```bash
supabase functions deploy purge-expired-files --no-verify-jwt
# Programa un cron (cada ~1 h) que invoque la función para el autoborrado.
```

## Fase 6 — Mini-tienda, afiliados e inclusión escolar

Migración: **`db/phase6.sql`** (13º archivo, después de `phase5.sql`). Idempotente.
Edge Function: `create-product-checkout`; el webhook `stripe-webhook` se amplió para `kind: 'product'`.

- **Mini-tienda transaccional:** nueva página **`/tienda`** lista productos activos con precio y permite **comprarlos** vía Stripe Checkout (*destination charge* al vendedor, igual que las consultas). El pedido se registra en `orders` y el webhook lo marca `paid`.
- **Afiliados con comisión:** el especialista crea su **código** y obtiene su **enlace** (`/tienda?ref=CODIGO`) en **Panel → Afiliados**, con un **% de comisión**. Al comprar con un `ref` activo (capturado en `localStorage`), el pedido guarda `affiliate_id` y `commission_cents`, y la comisión se cobra como `application_fee` a la plataforma. El afiliado ve sus **ventas y comisión acumulada**. *La liquidación al afiliado es fuera de la app* (o vía transfers de Stripe en el futuro).
- **Inclusión escolar + tours virtuales:** nuevo tipo de proveedor **escuela** (registro y `provider_type='school'`), página **`/inclusion-escolar`** con el directorio de escuelas, y **tour virtual** agendable desde el perfil de la escuela reutilizando la agenda (Fase 2) con enlace de videollamada.

```bash
supabase functions deploy create-product-checkout
supabase functions deploy stripe-webhook --no-verify-jwt
```

## Fase 7 — Neuromundi Academy (LMS)

Migración: **`db/phase7.sql`** (14º y último archivo, después de `phase6.sql`). Idempotente. Sin Edge Functions ni secretos nuevos.

- **Cursos → módulos → lecciones:** el instructor crea cursos en **Panel → Academy**, les agrega módulos y lecciones (con **video** para el aula virtual) y publica.
- **Catálogo:** página **`/academy`** con hero y tarjetas; cualquier usuario puede **inscribirse**.
- **Aula virtual:** página **`/academy/:id`** con módulos/lecciones, reproductor embebido (YouTube/Vimeo) o enlace, y **progreso** con lecciones marcables como completadas.
- **Inscripción de cualquier usuario:** familias y profesionales por igual; el progreso se guarda por usuario.

Los cursos son **gratuitos en este MVP**; cobrar por curso puede reusar el checkout de Stripe de la Fase 3/6 más adelante.

---

## Resumen del modelo "SaaS-Enabled Marketplace" (Fases 1–7)
1. Registro + legal (familias gratis, redes/cédula, reglamento+descargo).
2. Agenda + lista de espera con aprobación + recordatorios.
3. Pagos con Stripe Connect (consulta/terapia + reporte RFC).
4. Contenido (blogs/reels) + valoraciones + buscador + notificaciones.
5. Clínico (expediente, tareas, chat, reportes) + archivos E2E + rastreador local-first.
6. Mini-tienda + afiliados + inclusión escolar (tours).
7. Neuromundi Academy (LMS).

**Orden de SQL:** `00-base-schema` → `prescriptions` → `policies` → `networking` → `patients-and-locations` → `widen-consumer-policies` → `membership` → `phase1` … `phase7`.
