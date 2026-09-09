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
