# Instrucción de ejecución — Campaña de Fundadores Neuromundi

Para: la otra sesión de Claude que trabaja este repositorio
De: la sesión que preparó las tandas de invitación
Fecha: 29 de septiembre de 2026, 23:40 CDMX
Hora de referencia en todo el documento: **CDMX (UTC-6 todo el año)**

---

## REGLA QUE NO SE NEGOCIA

**No se envía ningún correo a terceros sin que Enyoria escriba textualmente
"envíalos ya", cada vez, para esa tanda en concreto.** No hay autorización
permanente y no existe una aprobación que cubra las cuatro tandas de una vez.

Ninguna tarea de este documento envía correo. Si al ejecutar alguna te parece
que hace falta enviar algo para probar, **detente y pregunta**.

Un comando que envía, publica, cobra o borra va en un mensaje aparte, solo, con
la primera línea diciendo qué hace y a cuántas personas.

---

## Estado medido (no estimado)

| Dato | Valor |
|---|---|
| Invitaciones **enviadas** | **0** |
| Invitaciones creadas en la tabla | 377, de ellas 366 vigentes |
| Cupo de fundadores | professionals 300 (299 libres), providers 150 (149 libres) |
| Fichas reclamadas | 0 |
| Correos enviados desde el dominio, histórico | 0 |
| Filas en `public.payments` | 0 (no es un defecto; ver nota al final) |
| Perfiles en el plan | 100, en 4 tandas de 25 |
| Techo tanda 1 a precio fundador | 131,500 MXN |
| Techo de las 100 a precio fundador | 419,500 MXN |
| Última migración en el repo | `0152`. **La siguiente libre es `0153`.** |
| Commits sin subir | ninguno |

---

## Decisiones de Enyoria — LAS TRES APROBADAS

| # | Decisión | Valor aprobado | Estado |
|---|---|---|---|
| D1 | Cupo de fundadores | `professionals` **300**, `providers` **150** | **YA APLICADO** — migración 0149, commit 8bd84c7 |
| D2 | Ficha sin reclamar | **degradar**, no suspender | pendiente de implementar (Tarea 10) |
| D3 | Lugares en el correo | **sin número** en tandas 1 y 2; con número en los recordatorios; contador vivo siempre en la plataforma | pendiente de implementar |

No queda ninguna decisión abierta. Todo este documento está aprobado.

---

## Estado al 30 de septiembre, 00:30 CDMX

**Hecho y verificado en producción** (base de datos, Edge Functions y frontend
desplegados): tareas 0, 1, 2, 3, 4, 6 y la decisión D1. Migraciones 0149 a 0152.
Edge Functions: `create-membership-checkout` v48, `stripe-webhook` v52.
Bundle publicado el 30 de septiembre a las 00:10 CDMX, comprobado contra el
sitio: sin `claim_founder_slot`, con los cupos 300/150.

**Pendiente antes de la tanda 1**
- Las cinco verificaciones de precio, sin pagar (las hace Enyoria).
- Tarea 13 para las tandas 2 a 4: quedan 20 nombres, dos críticos (#98 y #99).

**Pendiente durante octubre**
- Tareas 5, 7, 8, 9, 10, 11, 12 y 14.

**Advertencia de reparto:** todo lo de arriba toca las mismas tablas
(`directorio`, `founder_members`, `campaign_config`, `profiles`). Ya hubo
colisión de números de migración y desfase repo/base dos veces. **Que lo lleve
una sola sesión.** Si se reparte, que la segunda tome trabajo que no toque estas
tablas.

---

# TAREA 0 — HECHA. No la repitas.

**Estado: completada por Enyoria el 29 de septiembre a las 23:37 CDMX.**

`campaign_config.founder_discount` quedó en `[]`, cero etapas. Verificado contra
la base, no contra la pantalla.

`active` volvió a `true` a las 23:41, y eso ya es seguro: con las etapas
borradas, `founderPct` da 0 aunque la campaña esté encendida. La protección ya
no depende de tener la campaña apagada.

## Si alguna vez tienes que volver a tocar `campaign_config`

**No lo intentes con SQL desde una sesión en modo automático.** El clasificador
de permisos lo bloquea por ser configuración compartida de producción. No es un
error ni falta una credencial: es la barrera funcionando. Se resuelve desde el
panel de administración o con aprobación explícita de Enyoria en el chat.

Dos limitaciones del panel que conviene conocer, porque confunden:

- Las etapas de descuento se **borran con el ícono de bote de basura**. Poner
  los días en 0 no equivale: `AdminCampaign.tsx` filtra `s.days > 0` al guardar,
  así que un 0 se descarta y el renglón parece seguir ahí.
- Los "días por país" tienen el mismo filtro (`r.days > 0`, línea 74), así que
  **no se puede guardar un 0**. Para abrir el directorio no se usa ese campo:
  se usa `directory_open`, que en `useCampaign.ts` corta la evaluación antes de
  mirar días o países.

---

# TAREA 1 — HECHA · Doble descuento

## El defecto

`create-membership-checkout` aplica el beneficio de fundador **dos veces**:

1. `is_founder()` da verdadero, así que
   `membership_price_for(..., 'founder', ...)` devuelve el precio **ya rebajado**
   (clínica 5,000, no 10,000).
2. Encima lee `campaign_config.founder_discount`, calcula `founderPct` y lo manda
   a Stripe como cupón del 50%.

Resultado: la mitad de la mitad. Una clínica pagaría **2,500** donde el correo
promete 5,000.

## Por qué el pago de prueba salió bien

`start_at` es el 30 de septiembre a las 00:00 CDMX. El pago entró el 29 a las
22:16, con `dias_campana` negativo, así que el cupón valía 0% y se cobró el
precio correcto de 2,500. Fue coincidencia de reloj, no que el código funcione.

## Exposición

Si las 100 pagaran con la escalera activa se cobraría la mitad de 419,500: son
**209,750 MXN menos** de lo prometido por escrito.

## El arreglo

**Principio: un número, una fecha, un lugar.** El beneficio de fundador vive
únicamente en el renglón de `membership_prices`. El cupón escalonado desaparece.

En `supabase/functions/create-membership-checkout/index.ts`:

- Eliminar `founderPct` del cálculo de `combinedPct`.
- Quitar el bloque que lee `campaign_status()` para calcular etapas (el que
  empieza en el comentario "(3) Descuento de FUNDADOR por etapa").
- Quitar `founder_pct` de la metadata del cupón.

La puerta de tiempo pasa a ser sólo `founder_deadline_by_country`: antes de la
fecha se cobra el renglón de fundador, después el ordinario.

`MembershipModal.tsx` (línea 106) lee la misma configuración, así que la vista
previa que ve el usuario se corrige sola. **Compruébalo, no lo supongas.**

## Los precios ya están bien cargados

Los renglones de fundador ya son **exactamente la mitad** de los ordinarios en
los cinco tipos. Medido. No hay que calcular ningún descuento.

| Tipo de afiliado | Fundador | Ordinario | En las 100 |
|---|---|---|---|
| `school` | 8,000 | 16,000 | 3 |
| `clinic` / `medical_specialist` | 5,000 | 10,000 | 47 |
| `nonmedical_specialist` | 3,000 | 6,000 | 11 |
| `legal` | 3,500 | 7,000 | 5 |
| `merchant` / `caregiver` / `wellness` | 2,500 | 5,000 | 30 |

## Verificación exigida

Un pago de prueba por **cada uno de los cinco tipos de tarifa**, comprobando que
el monto que Stripe cobra es idéntico al que `registration_quote` imprime en el
correo. Sin esas cinco comprobaciones no se envía nada.

---

# TAREA 2 — HECHA · Asiento al pagar, no al entrar

## El defecto

`useFounderAutoClaim` en `src/hooks/useFounder.ts` reclama el asiento
**automáticamente en cuanto el usuario entra a la plataforma**, antes de ver el
precio y antes de pagar. `claim_founder_slot()` inserta la fila con
`grace_until = now() + 3 meses`, y `purge_lapsed_founders()` sólo libera el
asiento después de esa fecha. Un reclamo de octubre no libera asiento hasta
enero.

**Crear la cuenta consume el asiento.** No hace falta ni intención de pagar.

## El reparto real de las 100

`founderKindFor()` manda `merchant` a `providers` y **todo lo demás a
`professionals`**:

| Cupo | Invitados que caen ahí | Libres hoy |
|---|---|---|
| `professionals` | **92** | 99 |
| `providers` | **8** | 99 |

92 personas contra 99 asientos, consumidos por el simple hecho de entrar. Si las
cuatro tandas abren cuenta, `professionals` queda agotado sin un peso cobrado, y
las más de 900 fichas restantes no tienen nada que ofrecer.

## El arreglo

**El asiento se consume al pagar, no al entrar.** Si se quiere conservar el
"reserva tu lugar", que la entrada lo aparte **72 horas** y lo suelte si no hay
pago.

Sin este arreglo, el número de lugares que Enyoria quiere publicar no es
verificable: contaría visitantes como fundadores y le diría a un pagador real
"ya no quedan lugares" cuando nadie pagó por ellos.

## Cuidado: la capacidad está declarada dos veces

- `founder_capacity()` en SQL (`0076_company_founder_free.sql`, línea 17)
- `FOUNDER_CAPACITY` en `src/hooks/useFounder.ts`, líneas 35-40

Si cambias una y no la otra, la interfaz muestra un número y el servidor hace
cumplir otro. **Cambia ambas, o mejor: saca el valor a configuración** (es lo
que Enyoria pidió para el panel) y que las dos lo lean del mismo lugar.

Los valores **ya están aplicados**: `professionals` 300, `providers` 150 (migración
0149 en SQL y `FOUNDER_CAPACITY` en TypeScript, commit 8bd84c7). Verificado que
ambos coinciden. Lo que sigue pendiente aquí es **que el asiento se consuma al
pagar**, que es la causa y no el síntoma.

---

# TAREA 3 — HECHA · El reclamo copia el tipo al perfil

## El defecto

`marcar_ficha_reclamada()` sólo marca la ficha. **No copia nada al perfil.**

- El correo cotiza con
  `ficha_affiliate_type(directorio.provider_type, directorio.profession)`.
- El cobro usa `affiliate_type_for(usuario)`, que lee `profiles.provider_type` y
  `profiles.profession`, o sea lo que la persona declare al registrarse.

Las dos funciones tienen **lógica idéntica** (verificado). El problema es que
nadie llena la entrada.

Si ICADI (escuela, 8,000 en el correo) se registra como clínica, paga 5,000. Y
al revés: una ficha cotizada en 3,000 cuyo dueño se registre como clínica paga
5,000, **más de lo prometido por escrito** en un correo firmado por la Directora
General.

## El arreglo para ahora

Que el reclamo copie `provider_type` y `profession` de la ficha al perfil
**cuando estén vacíos**. No sobreescribas lo que la persona ya declaró.

## El arreglo estructural, para después

Guardar el precio cotizado y el tipo de afiliado en
`directorio_invitaciones` al crear la invitación, y que el checkout los honre
para quien llegue por un reclamo. Así el cobro es igual a la promesa por
construcción, sin depender de lo que la persona escriba.

---

# TAREA 4 — HECHA · Token de 60 días desde el envío

**Ajuste pedido por Enyoria.**

## Qué cambiar

`public.directorio_invitaciones.expira_en` tiene hoy
`default now() + interval '90 days'` (viene de `0093_invitaciones_reclamo.sql`,
línea 18). Pasa a **60 días**.

## Y un cambio de semántica que conviene hacer al mismo tiempo

Hoy la caducidad se cuenta **desde que se crea la fila**. Las filas existentes se
crearon entre el 8 y el 30 de septiembre, y **ninguna se ha enviado**. Si la
tanda 4 sale el 6 de octubre, una invitación creada el 8 de septiembre llegaría
con 32 de sus 60 días ya gastados, sin que nadie la haya visto.

Lo correcto es que los 60 días corran **desde el envío**:

- En `directorio_invitacion_enviada(p_token)` —el RPC que estampa `enviada_en`,
  llamado desde `enviar-invitaciones/index.ts` línea 363— fijar también
  `expira_en = now() + interval '60 days'`.
- El default de la columna queda en 60 días como red de seguridad para filas que
  se creen por otra vía.

## Las 366 invitaciones vigentes

Como no se ha enviado ninguna, recalcúlalas sin riesgo:
`expira_en = creada_en + interval '60 days'`. Quedarían venciendo entre el 7 de
noviembre y el 29 de noviembre.

## Comprobación de que no rompe la campaña

El plazo de fundador cierra el **31 de octubre**. Con 60 días desde el envío:

| Tanda | Envío | Token vence |
|---|---|---|
| 1 | 30 sep | 29 nov |
| 4 | 6 oct | 5 dic |

El token sobrevive al plazo de fundador con casi un mes de margen. El ajuste no
aprieta la campaña.

---

# TAREA 5 — PENDIENTE (Enyoria, panel) · Hora de corte del 31 de octubre

El **31 de octubre de 2026 es sábado**, y `founder_deadline_by_country` pone el
corte a las **00:00 CDMX** de ese día. En la práctica el último momento para
pagar es el viernes 30 por la noche.

El correo dice "si la activa antes del 31 de octubre". Alguien que lo lea
intentará pagar el sábado 31 y no podrá.

**Corrección:** mover el corte a las **23:59 CDMX del 31 de octubre**, es decir
`2026-11-01T05:59:00Z`, para que gane la lectura generosa y el texto del correo
quede intacto.

Este campo está en `campaign_config`, así que **lo hace Enyoria desde el panel**
o con su aprobación explícita (misma barrera que la Tarea 0).

---

# TAREA 6 — HECHA · Fundador sólo con pago anual

**Decidido por Enyoria: el asiento de fundador exige pago anual.** El mensual
queda disponible sólo para cuota ordinaria.

Sin esta regla, una clínica fundadora pagaría 500 al mes en lugar de 5,000 al
año y podría cancelar al mes siguiente habiendo ocupado un asiento por 500
pesos.

Nota: el pago de prueba de Enyoria quedó registrado como `monthly`
(`membership_period = 'monthly'`, vigencia al 30 de octubre). Es el pago de
prueba, no un caso real, pero confirma que la ruta mensual es alcanzable desde
la interfaz.

---

# TAREA 7 — PENDIENTE · País obligatorio

**Decidido por Enyoria: sin país no se habilita el botón de continuar.**

No pongas un valor por omisión. Enyoria lo rechazó con razón: un valor por
omisión daría precios incorrectos para países donde no aplique.

Dato verificado: **`directorio` no tiene columna de país**, sólo `estado` y
`ciudad`. El reclamo no puede copiarlo de la ficha; hay que pedirlo.

Para las 100 de esta campaña el formulario puede mostrar México ya marcado
—porque su `estado` es un estado mexicano, dato verificable y no supuesto— y
exigir la confirmación de todos modos.

Cuidado: hoy 2 de los 3 perfiles existentes tienen `country` en nulo. El
contador de la Tarea 8 depende de este campo.

---

# TAREA 8 — PENDIENTE · Contador de días restantes

**Decidido por Enyoria.**

- Visible **cada vez que el usuario entra**, mientras no haya pagado.
- Desaparece al pagar.
- Lee `founder_deadline_by_country` según el país del perfil.
- Depende de la Tarea 7: sin país no resuelve la fecha.

---

# TAREA 9 — PENDIENTE · Recordatorios

**Decidido por Enyoria: dos por correo, no cinco.** La razón está en la Tarea 12
y conviene leerla antes de implementar.

## Correo — dos envíos, fechas absolutas

| | Fecha | Día | Momento |
|---|---|---|---|
| Recordatorio 1 | **jueves 15 de octubre de 2026** | jueves | mitad de plazo |
| Recordatorio 2 | **miércoles 28 de octubre de 2026** | miércoles | 3 días antes del cierre |

Iguales para las cuatro tandas, porque la fecha límite también es absoluta. Las
dos caen en día permitido (martes, miércoles o jueves) sin necesidad de correr
la fecha.

Se detiene al pagar, al pedir la baja, al pedir la salida del directorio, al
rebotar y al vencer el plazo.

**Nunca se dispara solo. Cada envío requiere "envíalos ya".**

Nota de calendario: en la ventana del 30 de septiembre al 31 de octubre de 2026
**no cae ningún día inhábil oficial en México**. La regla de días inhábiles que
pidió Enyoria (sólo martes, miércoles o jueves; si cae en viernes, sábado,
domingo, lunes o inhábil, se corre al siguiente permitido) queda programada para
campañas posteriores.

## En plataforma

Cada **5 días** desde la fecha de envío de la invitación, **cualquier día de la
semana**. Se detiene al pagar.

## Dos enlaces distintos, no uno

El correo lleva hoy `List-Unsubscribe`, que significa "no me escriban". Hace
falta **además** un enlace de **"no quiero aparecer en el directorio"**.

No son lo mismo, y confundirlos es lo que genera quejas. El segundo enlace
convierte el silencio en decisión, que es el objetivo declarado de la campaña, y
es la mejor protección para la reputación del dominio.

---

# TAREA 10 — PENDIENTE · Degradar la ficha sin reclamar (D2 aprobada)

**Enyoria aprobó degradar, no suspender.**

La ficha no se borra: se queda publicada pero reducida, para que el negocio vea
la diferencia y las familias sigan encontrando útil el directorio.

## Qué se oculta en una ficha sin reclamar

| | Verificada | Sin verificar |
|---|---|---|
| Aparece en el directorio | sí | sí |
| Nombre, categoría, estado, ciudad | sí | sí |
| `telefono` | visible | **oculto** |
| `correo` | visible | **oculto** |
| `sitio_web` | visible | **oculto** |
| Botón de contacto | sí | **no** |
| Etiqueta | — | **"Sin verificar"** |
| Orden en resultados | normal | **debajo de las verificadas** |

Criterio: `reclamada_por is null` y `estado_revision = 'publicado'`.

## Tres condiciones que la hacen funcionar

1. **Entra en vigor el 15 de noviembre de 2026**, después del cierre del plazo
   de fundador. Degradar durante octubre encogería el directorio justo cuando se
   está vendiendo.
2. **El correo anuncia la fecha.** Sin aviso no es presión, es sorpresa, y las
   sorpresas generan quejas en vez de pagos.
3. **Se revierte sola** al reclamar la ficha. No hace falta pagar para recuperar
   los datos de contacto: basta confirmar que existen y que quieren estar. Ese
   es el objetivo declarado — que reaccionen y confirmen o rechacen.

## Suspensión completa: sigue en pie para otro caso

Quien **reclamó y no pagó** al vencer el plazo sí desaparece del directorio
hasta que pague (Tarea 11). Ahí la relación existe.

## Disparador para escalar

Si al **28 de octubre** menos del **15%** de los 100 ha reclamado su ficha, la
degradación no está sirviendo de palanca y se pasa a suspensión por silencio en
la siguiente oleada. Lo decide el dato, no la intuición.

---

# TAREA 11 — PENDIENTE · Vencimiento del plazo (CORREGIDA)

Aplica a quien **reclamó su ficha y no pagó**.

1. Al vencer, aviso de que el plazo concluyó, con **una última oportunidad** de
   pagar y entrar como fundador.
2. Si no la toma, el aviso **no vuelve a aparecer**. Hay que registrar que ya se
   mostró y se descartó.
3. El perfil pasa automáticamente a **cuota ordinaria**.

## Corrección aprobada por Enyoria el 30 de septiembre

La regla original suspendía del directorio a quien reclamaba y no pagaba,
mientras que D2 sólo degrada a quien nunca reclamó. Eso dejaba el incentivo al
revés:

| Qué hace el invitado | Qué le pasaba |
|---|---|
| Ignora el correo | degradación — sigue en el directorio |
| Confirma y no paga | **suspensión — desaparece del directorio** |

Quien responde terminaba peor que quien ignora. Y el correo promete que
confirmar es gratuito y conserva los datos visibles, así que el sistema habría
contradicho por escrito lo que se le dijo al destinatario.

**Ahora: a quien confirmó y no pagó se le aplica la MISMA degradación** de la
Tarea 10 — sigue publicado, marcado «sin verificar», sin teléfono, sin correo y
sin sitio web, por debajo de los perfiles verificados. La palanca se conserva;
lo que desaparece es la incoherencia.

La **suspensión completa** queda reservada para bajas voluntarias y correos
rebotados.

---

# TAREA 12 — PENDIENTE · Cupo de fundadores al panel

| Ajuste | Estado hoy | Trabajo |
|---|---|---|
| Plazo de fundador | `campaign_config.founder_deadline_by_country`, editable | corregir la hora de corte (Tarea 5) |
| Etapas de descuento | editables en `AdminCampaign` | vaciarlas (Tarea 0) |
| Número de fundadores | `founder_capacity()` **fijo en código**, y duplicado en TypeScript | sacarlo a configuración y agregarlo al panel |

Enyoria pidió poder ampliar el número de fundadores y el plazo. El plazo ya es
editable; el número no.

## Advertencia de reputación — leer antes de tocar los recordatorios

El dominio **no ha enviado un solo correo en su historia** (0 enviados, medido).
Las direcciones vienen del DENUE, fuente pública del INEGI, y **nadie dio
consentimiento**.

Si el dominio se marca como spam, deja de llegar **todo**: los correos a quienes
ya pagaron, los de recuperación de contraseña y los recibos. No se arregla con
dinero ni en poco tiempo.

Por eso los recordatorios por correo bajaron de cinco a dos, y la cadencia corta
se conservó íntegra en plataforma, donde no cuesta reputación.

---

# TAREA 13 — PARCIAL · Nombres del DENUE (falta 20 de 21)

21 de los 100 traen el nombre en mayúsculas del DENUE. La función de correo
interpola el nombre tal cual: `Hola, equipo de <b>${nombre}</b>`. Sin titlecase
ni limpieza.

Dos no pueden salir así:

- **#98** — el nombre termina en `SIN NOMBRE`, que es el relleno del DENUE
  cuando el establecimiento no declaró razón social. El correo diría
  "Hola, equipo de CONSULTORIO … SIN NOMBRE".
- **#99** — `CUIDADO DE NIÑOS CRIT`. Si es un CRIT de Teletón es fundación, le
  corresponde exención y el correo le estaría cobrando.

El detalle por fila está en la hoja **Alertas** de
`Destinatarios campana Neuromundi.xlsx`.

**Para la tanda 1 sólo hay un nombre por corregir: ICADI (#6).**

---

# TAREA 14 — PENDIENTE · Lugares en el correo (D3 aprobada)

**Enyoria aprobó la propuesta.**

El número de lugares sólo comunica escasez cuando es bajo. Al arrancar la
campaña es alto por definición: hoy diría "quedan 299 de 300", que invita a
tomarse tiempo — lo contrario de la urgencia buscada.

| Momento | ¿Dice el número? |
|---|---|
| Tanda 1 (30 sep) y tanda 2 (1 oct) | **No.** Da la fecha límite y dice que los lugares son limitados y se cierran |
| Recordatorio del 15 de octubre | Sólo si ya es bajo |
| Recordatorio del 28 de octubre | **Sí**, con los días restantes |
| Plataforma | **Siempre**, contador vivo |

La plataforma es donde la escasez se vuelve **verificable**: el destinatario
puede ir a comprobarla.

El texto habla de los lugares **de esta etapa**, no del total, para que ampliar
después abra una etapa nueva en vez de desmentir lo ya dicho.

**Depende de la Tarea 2:** mientras el asiento se consuma al entrar, el número
cuenta visitantes como fundadores y no es publicable.

---

# Orden de ejecución

**Antes de la tanda 1** (obligatorio, sin excepciones)
1. ~~Tarea 0 — vaciar etapas.~~ **HECHA el 29 de septiembre.**
2. Tarea 1 — quitar el doble descuento.
3. Tarea 3 — que el reclamo copie tipo y profesión.
4. Tarea 4 — token a 60 días, contados desde el envío.
5. Tarea 6 — asiento de fundador sólo con pago anual.
6. Tarea 13 — corregir ICADI (#6).
7. Tarea 2 — asiento al pagar (el cupo nuevo ya está aplicado).
8. **Las cinco pruebas de pago de la Tarea 1.**

**Antes de publicar el número de lugares**
9. Tarea 2 completa.
10. Tarea 5 — hora de corte del plazo.
11. Tarea 14 — texto de lugares por etapa.

**Durante octubre**
12. Tarea 7 — país obligatorio.
13. Tarea 8 — contador.
14. Tarea 9 — recordatorio en plataforma, luego los de correo del 15 y 28.
15. Tarea 12 — cupo a configuración y control en el panel.
16. Tarea 10 — degradación, en vigor el 15 de noviembre.
17. Tarea 11 — flujo de vencimiento.
18. Tarea 13 — los 19 nombres restantes y los dos críticos.

---

# Advertencias de proceso

Estas tres cosas ya salieron mal. No las repitas.

**Una sesión a la vez sobre estas tablas.** Hubo colisión de números de
migración y la base quedó adelantada al repositorio dos veces. Si el trabajo se
reparte, que cada sesión tome tareas distintas y que **ninguna aplique una
migración sin escribir el archivo en el repositorio en el mismo movimiento**.
La siguiente migración libre es **0153**.

**`git push` pendiente** de 0147 y 0148.

**`campaign_config` no se toca desde una sesión en modo automático.** El
clasificador lo bloquea por ser configuración compartida de producción. Panel o
aprobación explícita de Enyoria.

**`public.payments` en cero no es un defecto.** Esa tabla es sólo para pagos de
consulta y terapia, y el webhook la *actualiza*, no inserta en ella. Los pagos
de membresía escriben en `profiles` y en `founder_members`. Lo que sí falta es
un registro contable de ingresos por membresía: hoy no hay tabla que diga "este
socio pagó tanto tal día", sólo el estado actual del perfil y Stripe. No es
bloqueante para enviar, pero Enyoria no puede responder "cuánto llevamos" desde
la base.

**El CLI de Supabase falla en su máquina.** `secrets set` y `functions deploy`
terminan sin aplicar aunque no marquen error claro (el glifo ▲ con el mensaje de
PostHog es una falla real). Se detecta porque la versión de la función no
incrementa. Se libra por el panel de Supabase.
