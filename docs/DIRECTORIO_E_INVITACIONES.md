# Directorio de fichas e invitaciones por reclamo

*Traspaso al hilo principal de Neuromundi. Estado al 9 de septiembre de 2026.*

Todo lo de aquí **ya está aplicado en producción**. Las migraciones 0091–0096
recogen el estado real de la base.

---

## 1 · Qué se construyó y por qué

**El problema:** `public.profiles.id` tiene llave foránea a `auth.users` con
`ON DELETE CASCADE`. No puede existir un perfil sin cuenta. Para precargar
establecimientos que aún no se registran había que inventarles un correo — y ya
existían 355 cuentas con dirección `@preview.neuromundi.com`.

**La solución:** una tabla de fichas sin cuenta, y la cuenta nace cuando la
persona acepta su invitación.

| Objeto | Qué es |
|---|---|
| `public.directorio` | fichas sin cuenta, con procedencia y ciclo de vida |
| `public.directorio_publico` | vista que une perfiles y fichas; **es lo que lee el buscador** |
| `public.directorio_invitaciones` | token de un solo uso, 90 días |
| `ficha_por_token(token)` | lo que ve quien abre el enlace |
| `solicitar_baja_ficha(token, motivo)` | baja en un clic, sin cuenta |
| `marcar_ficha_reclamada(token, perfil)` | solo la clave de servicio |
| Edge Function `reclamar-ficha` | crea la cuenta al aceptar |
| `src/pages/ReclamarFicha.tsx` | ruta `/reclamar/:token` |

**El front lee de la vista.** `useDirectory.ts` y `SchoolInclusion.tsx` apuntan a
`directorio_publico`, no a `profiles`. La vista es un superconjunto exacto de
`profiles` más tres columnas: `origen`, `clee` y `reclamable`.

> ⚠️ El orden de columnas de la rama de fichas depende del orden de columnas de
> `profiles`. Si añades una columna a `profiles`, añade su equivalente en la
> vista, en la misma posición, o la vista deja de crearse.

---

## 2 · Estado de los datos

| | |
|---|---:|
| Fichas publicadas | 679 |
| En el buscador (`directorio_publico`) | 679 |
| Cuentas en `auth.users` | 5 |
| Invitaciones por enviar | 314 |
| Invitaciones enviadas | **0** |

**Sector**, que decide si se le pide cuota:

| Sector | Fichas | ¿Paga? |
|---|---:|---|
| publico | 195 | no (`exempt`) |
| social | 135 | no (`exempt`) |
| privado | 162 | sí (`pending`, 15 días) |
| sin clasificar | 187 | se trata como privado |

El sector sale del **código SCIAN del INEGI** —las clases pares son sector
público— y, para las fichas de investigación propia, de la figura jurídica del
nombre. Quedan **46 con correo sin clasificar** que conviene revisar a mano.

---

## 3 · Incidente del 8 de septiembre

El cron `nm-campaign-emails` mandó **100 correos** «¡Bienvenido a Neuromundi,
Miembro Fundador!» a proveedores sembrados que nunca se registraron. Una sola
ráfaga de 16 segundos, a las 14:00 de Ciudad de México. **Nadie lo autorizó.**

- 87 entregados · 11 rebotados · 2 retrasados
- 77 recibieron la variante de pago («50% si pagas en 15 días»), y **20 de esos
  son organismos públicos**: DIF estatales, comisiones de derechos humanos, el
  Consejo de la Judicatura.
- La causa: la variante la decidía `provider_type`, y un DIF estatal está
  clasificado como `clinic`. La regla `trg_company_membership_free` solo exenta
  a `company` y `ngo`.
- Corregido en la 0096: la cola entrega el sector y `campaign-emails` lo respeta.
- Los 100 destinatarios quedaron en `public.contactados_campana_20260908`,
  reconstruidos desde el registro de Resend porque la evidencia en
  `campaign_emails` se perdió al borrar las cuentas.

### Envíos suspendidos

Estos cuatro cron están **apagados** y hay que decidir cuándo reactivarlos:

| Trabajo | Frecuencia |
|---|---|
| `nm-campaign-emails` | cada 2 h |
| `nm-send-reminders` | cada 10 min |
| `nm-appt-reminders` | cada 30 min |
| `nm-suspension-reminders` | lunes 9:00 |

Los de limpieza siguen encendidos; no mandan correo.

> **Regla vigente del titular: ningún envío a terceros sin su visto bueno
> expreso, cada vez.** El script `enviar-invitaciones.mjs` tiene candado: exige
> `--autorizado` y no manda ni la prueba sin él.

---

## 4 · Lo que se aprendió, para no repetirlo

**Un `catch` genérico cuesta rondas enteras.** El botón de reclamo falló dos
veces: primero por 401 —faltaba la llave en la petición— y luego por CORS, al
añadir esa llave sin declararla en `Access-Control-Allow-Headers`. En el segundo
caso el navegador aprobaba el `OPTIONS` y nunca mandaba el `POST`: en los
registros solo aparecía el `OPTIONS`. Ahora los errores se imprimen en consola.

**Los correos mexicanos llevan dominios de tres niveles.** La validación
`[^@\s.]+\.[a-z]{2,}` admite un solo punto y rechazaba 63 direcciones válidas
—`.org.mx`, `.gob.mx`, `.com.mx`—, justo las institucionales. Corregido en la
base y en los cuatro scripts.

**El DENUE es la buena fuente para México.** Gratis, token por correo sin
tarjeta. La clave es el código SCIAN de 6 dígitos: `813210` para templos,
`621331`/`621341`/`611182` para este directorio. `BuscarAreaAct` lleva 14
parámetros y el `Id` va antes del token. **`BuscarEntidad` no busca por nombre**
—devuelve resultados sin relación con el término—, así que el emparejamiento se
hace en local contra el archivo descargado.

**Un emparejador necesita saber qué palabras distinguen.** Una lista escrita a
mano nunca incluye ORTOPEDIA ni ZAMORA. Se mide la frecuencia de cada palabra en
el propio corpus: la que aparece mucho no identifica.

---

## 5 · Pendiente

1. **Revisar los 46 sin clasificar con correo** antes de invitar: ahí están el
   Hospital Universitario de la UANL, el CREE de Toluca del DIFEM y los CRIT.
2. **Decidir qué hacer con los 87** que recibieron la bienvenida equivocada.
3. **Cuota de Resend:** plan gratuito son 100 al día y 3,000 al mes. Los 314 son
   cuatro días, o plan Pro (20 USD, 50,000 correos).
4. **Reactivar los cron** que corresponda, ya con el criterio de sector.
5. **Limpiar** las tablas `respaldo_355_*`, `respaldo_232_*` y las fichas
   `PRUEBA-INTERNA-000x` cuando ya no hagan falta.

---

## 6 · Scripts

Viven en `C:\Users\jorme\Downloads`, fuera del repo porque leen `.env` con la
clave de servicio:

| Script | Qué hace |
|---|---|
| `barrido-denue.mjs` | descarga fichas del DENUE, reanudable |
| `clasificar-denue.mjs` | las separa en ALTA / VERIFICAR / DESCARTADOS |
| `sembrar-directorio.mjs` | genera el SQL de carga desde un CSV revisado |
| `emparejar-local.mjs` | cruza el DENUE contra un CSV propio, llena huecos |
| `contar-clases.mjs` | cuenta establecimientos por clase y estado |
| `enviar-invitaciones.mjs` | manda las invitaciones · **exige `--autorizado`** |
| `sonda-residencias.mjs` | descubre y cuenta las clases de residencias, asilos y hospitales |
| `clasificar-residencias.mjs` | aplica el criterio de admisión por deterioro cognitivo |

Los dos últimos viven en la raíz del repo y leen `denue.env`, que está ignorado
por git (`*.env`, línea 42 del `.gitignore`).

---

## 7 · Criterio de admisión: residencias de adultos mayores

Decidido el 9 de septiembre de 2026.

Neuromundi cubre neurodesarrollo, neurodivergencias y afecciones neurológicas.
Una residencia geriátrica general no cabe ahí. Una que atiende deterioro
cognitivo, sí, y de lleno.

**La regla es la condición atendida, no el giro del establecimiento.** Una
residencia de adultos mayores entra si atiende Alzheimer, demencias, deterioro
cognitivo, Parkinson o daño cerebral. No entra por ser residencia.

Sin esta regla, un barrido de las clases 6231–6233 mete cientos de asilos
generales, y el buscador se llena de resultados que no le sirven a la persona
que está buscando.

**Cómo se aplica.** El DENUE no dice qué atiende cada establecimiento: da
nombre, clase, domicilio y contacto. Así que la admisión no se resuelve con el
dato del INEGI y hacen falta dos etapas:

1. `clasificar-residencias.mjs` separa en tres. Entra directo lo que el nombre
   ya prueba (dice Alzheimer, memoria, demencia, neuro). Sale lo que es otra
   cosa (orfanatos, casas hogar infantiles, anexos de adicciones) y lo que no
   tiene sitio ni correo, porque no hay cómo verificarlo ni cómo invitarlo.
   El resto queda por verificar.
2. Las de "por verificar" se revisan en su propio sitio buscando la evidencia.
   Solo las que la tengan entran al directorio.

**Caso de referencia: Ballesol México.** Cadena española con dos residencias en
el país (Corregidora, Querétaro y Lomas Verdes, Naucalpan). Su nombre no dice
nada, así que caería en "por verificar". Su sitio prueba el ámbito: equipo de
enfermería especializado en Alzheimer, programas de estimulación cognitiva,
talleres de memoria y orientación a la realidad. **Entra.**

Conviene notar que su oferta se presenta como cuidados paliativos con
estimulación cognitiva, no como unidad de memoria separada. Aun así cumple: la
regla pregunta si atiende la condición, no cómo organiza el servicio.

**El sector se lee del nombre de la clase, no de la paridad del código.**

Veníamos usando un atajo: último dígito par = sector público. Funciona en los
pares terminados en 1/2 (611181 privado / 611182 público) y por eso nunca falló
antes. Pero se rompe en los terminados en 8/9, donde la convención se invierte:
**621398 es privado y 621399 es público**. En la sonda del sector 62 el atajo
falla en 8 de 64 clases, y una de ellas, 621398, tiene 9,565 establecimientos.

El dato bueno estaba a la vista todo el tiempo: el INEGI escribe el sector en el
propio nombre de la clase ("del sector privado", "del sector público"). De ahí se
lee. Hay clases sin división de sector — enfermería a domicilio, optometría,
ambulancias — y ahí el campo queda vacío y lo resuelve la verificación.

Las fichas ya cargadas no están afectadas: todas son de clases 1/2, verificado
contra la base.

## Pendiente para la TANDA FINAL (anotado el 21 oct 2026)

Antes de lanzar la última tanda hay que recordarle a Enyoria estos tres bloques.

### 1. Las 31 fichas apartadas (tanda 99)
Van al final de la campaña por instrucción suya. Incluye, desde el 21 de octubre,
a **Úpale — Desarrollo del Potencial Infantil**, movida de la tanda 46 porque
comparte buzón (`info@upale.com.mx`) con la ficha «Úpale», que ya recibió su
invitación el 20 de octubre.

### 2. Las fichas que comparten buzón
Por instrucción de Enyoria (21 oct 2026) quedan para revisión en la tanda final,
no se fusionan antes:

| Buzón | Fichas |
|---|---|
| `contacto@ccyet.mx` | CCYET Centro de Capacitación y Educación Terapéutica · CCYET – Centro de Estimulación Temprana |
| `recepcion@clinicainfantil.com.mx` | Clínica de Atención Infantil y Neurodesarrollo CAI · Clínica Especializada en Atención Infantil (CAI) |
| `info@upale.com.mx` | Úpale · Úpale — Desarrollo del Potencial Infantil |
| `cancelaciones@teleton.org.mx` | CRIT Estado de México · CRIT Teletón Quintana Roo (NO son duplicados: dos centros distintos con un buzón institucional compartido, y además es un buzón de *cancelaciones*, mal sitio para una invitación) |

### 3. Duplicados detectados y NO fusionados
Esperan decisión de Enyoria sobre cuál ficha sobrevive:
Centro de Neurodesarrollo y Clínica de la Conducta (×2, CDMX) · CCYET (×2) ·
Úpale (×2) · Clínica CAI (×2) · Centro de Entrenamiento Psicológico Infantil
(×2, Culiacán). Aparte, **HOPE Centro de Rehabilitación Integral** (San Nicolás)
y **CERI** (San Luis Potosí) comparten correo siendo nombres y ciudades
distintos: puede ser un correo mal asignado, no un duplicado.

NO son duplicados aunque se parezcan: los CAM y USAER numerados, los CREE de los
distintos DIF estatales, y APNA/APNAV/APNAC/APNABA/APNALP en España.

## DEFECTO ABIERTO: la cola deduplica por buzón DENTRO de una tanda, no entre tandas

`directorio_invitaciones_cola_tanda_v3` numera con
`row_number() over (partition by lower(btrim(i.correo)) order by pl.orden)` y se
queda con `n = 1`, pero ese conteo sólo ve las filas de ESA tanda. Dos fichas
con el mismo buzón en tandas distintas reciben las dos.

Ya ocurrió, medido el 21 de octubre de 2026 — tres buzones recibieron dos
invitaciones cada uno:

- `contacto@ccyet.mx` — tanda 1 (20 oct 13:07) y tanda 2 (20 oct 15:30)
- `recepcion@clinicainfantil.com.mx` — tanda 1 (20 oct 13:07) y tanda 2 (20 oct 15:30)
- `cancelaciones@teleton.org.mx` — tanda 49 (20 oct 15:30) y tanda 49 (21 oct 09:00)

La cola del segundo contacto (`directorio_invitaciones_cola_reenvio`) SÍ
deduplica globalmente, por eso ahí no volvió a pasar.

Arreglo propuesto, pendiente de aplicar: excluir de la cola toda invitación cuyo
buzón YA tenga otra invitación con `enviada_en is not null`. No se aplicó el 21
de octubre porque las tandas estaban saliendo cada 20 minutos y tocar la función
de la cola entre dos envíos es arriesgado; el único caso pendiente se apartó a
mano a la tanda 99.

## REGLA DE FUSION DE DUPLICADOS (propuesta el 21 oct 2026, pendiente de aprobacion)

Se aplica en la TANDA FINAL, nunca antes, y ficha por ficha con el antes/despues
a la vista. Ninguna fusion se ejecuta sin el visto bueno de Enyoria sobre ese
par concreto.

**Que ficha sobrevive**, en este orden; el primer criterio que decida, manda:

1. **La que ya fue reclamada** por su titular. Si una tiene `reclamada_por`, esa
   sobrevive sin discusion: detras hay una persona con cuenta y perfil.
2. **La que ya recibio invitacion** (`enviada_en`). Su token esta sellado y su
   plazo de fundador contado desde el envio; borrarla invalida un enlace que
   alguien tiene en su bandeja. Si ambas fueron invitadas, sobrevive la primera.
3. **La de fuente curada** antes que la de padron automatico (`denue`,
   `iluminemos`): el nombre y la clasificacion ya pasaron por revision humana.
4. **La que tenga mas campos llenos**, contando correo, telefono, sitio,
   direccion, geolocalizacion, areas de intervencion, especialidades y
   descripcion del giro.

**Que se conserva de la ficha que se borra** — la fusion enriquece, no solo
elimina:

5. Antes de borrar, se copian a la superviviente TODOS los campos que ella tenga
   vacios y la otra llenos. Medido en los cinco pares del 21 de octubre: ninguna
   ficha domina a su gemela en todos los campos, asi que quedarse con una a
   secas SIEMPRE pierde datos. Ejemplo: en CCYET la ficha de `iluminemos` tiene
   direccion y la curada no, pero la curada tiene 3 areas, 3 especialidades y 82
   caracteres de giro, y la otra ninguno.
6. **El nombre que queda es el mejor escrito y mas descriptivo**, aunque venga de
   la ficha que se borra. Nunca el de MAYUSCULAS de padron.
7. Antes de cualquier borrado se respalda la ficha completa en una tabla
   `respaldo_fusion_<fecha>`, como se hizo con `respaldo_directorio_20261019`.

**Lo que esta regla NO decide**: si dos fichas son la misma organizacion. Eso lo
dice Enyoria. La regla solo dice que hacer una vez el ya lo decidio.

### Los cinco pares, con lo que la regla dictaria

| Par | Sobrevive por | Observacion |
|---|---|---|
| CCYET Capacitacion (tanda 1, invitada) / CCYET Estimulacion Temprana (tanda 2, invitada) | regla 2: la primera invitada | ambas ya recibieron correo |
| Clinica CAI Neurodesarrollo (tanda 1, invitada) / CAI Especializada (tanda 2, invitada) | regla 2: la primera invitada | ambas ya recibieron correo |
| Upale (tanda 2, invitada) / Upale Desarrollo del Potencial (apartada a 99) | regla 2 | la segunda nunca recibio |
| CEPI Culiacan curada (tanda 2, invitada) / CENTRO... DENUE (apartada a 99 el 21 oct) | regla 2 | correos DISTINTOS: la guarda por buzon no la frenaba |
| Centro de Neurodesarrollo y Clinica de la Conducta / Centro de Neurodesarrollo / Clinica de la Conducta | regla 4 | **ninguna tiene correo** y ninguna esta en el plan: no se invitan |

CORRECCION al informe del 21 de octubre: ese ultimo par se marco como "mismo
correo", pero lo que comparten es NO TENER correo (dos nulos comparan iguales).
Siguen pareciendo duplicados por nombre y ciudad, pero esa evidencia concreta
era espuria.

## EL PLAN DE PAGA SE SEPARA POR TIPO DE BUZON (21 oct 2026)

### Por que
Medido el 21 de octubre, con 466 invitaciones enviadas y el mismo tiempo de
exposicion en ambos grupos (13.1 h contra 12.3 h de promedio):

| Tipo de buzon | Entregadas | Visitas al enlace | Reclamos |
|---|---|---|---|
| Institucional (`@suorganizacion.com`) | 280 | 28 — **10.0%** | 2 |
| Personal (gmail, hotmail, yahoo…) | 160 | 0 — **0.0%** | 0 |

Cero de 160. Con la tasa del 10% de los institucionales, 160 envios deberian
haber dado unas 16 visitas. La probabilidad de que salga cero por azar es
despreciable.

Eso explica el carril de paga mejor que el precio: el 61% de las fichas de paga
ya escritas son buzones personales, frente al 31% de las exentas. No es que la
cuota asuste; es que a la mayoria se le escribio a un gmail.

HIPOTESIS NO MEDIDA: Gmail y Hotmail estan clasificando el correo como
promocion o spam. `email.delivered` significa que el servidor lo acepto, NO que
llegara a la bandeja principal. Son dos cosas distintas y se venian leyendo como
una. Para confirmarlo hace falta la cuenta de Resend (el 21 de octubre no habia
sesion abierta) y, sobre todo, Google Postmaster Tools, que es quien dice la
tasa de spam real del dominio.

### Como queda el plan
- **101–126 · buzon institucional, 265 fichas en 26 tandas.** Listas para
  enviar; son las que tienen posibilidad real de responder.
- **201–227 · buzon personal, 299 fichas en 27 tandas.** EN ESPERA. Un correo
  mas no entra donde no entro el primero: antes hay que resolver la entrega o
  cambiar de canal.
- 98 (60 escuelas publicas) y 99 (32 apartadas) sin cambios.

Dentro de cada pais los tipos de perfil quedan contiguos, para que el resumen de
cada tanda siga siendo legible. El corte de 25 es por pais.

Respaldo del plan anterior: `respaldo_plan_invitacion_20261021`.

## Museos y espacios culturales: organizaciones aliadas (regla permanente, 21 oct 2026)

Enyoria: *"vamos a manejar a los museos como organizaciones aliadas, generalmente son
de recursos limitados y no pagarían una cuota por visibilidad"*.

No es una excepción puntual: es una regla a tener presente de forma permanente.

### Qué se hizo el 21 de octubre
Siete fichas estaban como `sector='privado'`, es decir, en el carril de paga. Cuatro
de ellas salían a las **09:20 del día siguiente en la tanda 118**, con una cuota de
$2,500 MXN en el correo:

| Ficha | Dónde estaba |
|---|---|
| 3 Museos / Museo de Historia Mexicana (Monterrey) | tanda 118, salía en 11 horas |
| Museo del Acero Horno³ (Monterrey) | tanda 118, salía en 11 horas |
| Museo del Estanquillo (CDMX) | tanda 118, salía en 11 horas |
| Aquarium de Veracruz — 'Conexión Azul' | tanda 118, salía en 11 horas |
| Gran Museo del Mundo Maya (Mérida) | tanda 220 (en espera) |
| CECUT — Centro Cultural Tijuana | sin tanda |
| Papalote Museo del Niño (Monterrey) | sin tanda |

Las siete pasaron a `sector='social'` y las cinco que tenían ficha de invitación se
movieron a la **tanda 130 — museos y espacios culturales aliados**, carril exento y
SIN programar: necesita su resumen y su autorización como cualquier otra.

CECUT y Papalote no tienen invitación creada, así que no pueden entrar en una tanda
hasta que se les genere una. Quedan con el sector corregido.

### Pendiente de decidir
Cuatro fichas de **playas incluyentes** (`provider_type='tourism'`): Progreso y Playa
Miramar ya están como `publico`; **Bahías de Papanoa** y **La Entrega (Huatulco)**
siguen como `privado`. Son playas, no museos, así que la regla no las cubre por su
letra — pero sí por su espíritu. Enyoria decide.

### Cómo detectarlos
Buscar por nombre `museo|museum|aquarium|acuario|planetario|zoológico|jardín botánico|
pinacoteca|galería de arte` y por `provider_type='tourism'`, y revisar el `sector`.
