# Repaso adversario: el método, y por qué hace falta

Los siete auditores automáticos comprueban cosas que alguien supo formular. Este
repaso es para lo que **nadie formuló**, y es la única parte de la revisión que
no se puede automatizar, porque consiste precisamente en salir del modelo mental
con el que se escribió el código.

## La evidencia

Los defectos encontrados el 19 de octubre de 2026 tenían **todos la misma
forma**, y ninguno estaba formulado en ninguna comprobación:

| Lo que pasaba | Lo que se veía |
|---|---|
| El directorio mostraba 1,000 fichas de 1,818 | Un directorio normal |
| El envío de invitaciones cortaba el lote a 50 | "Enviados: 50" |
| 746 fichas del plan no tenían token y la cola las saltaba | Un ensayo en seco con menos correos |
| 15 fichas publicadas no tenían área | Fichas publicadas |
| Ocho pantallas imprimían la clave interna del tipo de miembro | "service_provider" |
| 19 textos sin acentos y 88 con un artículo de más | Texto |
| El conteo de visitas llevaba meses fallando | Cero visitas |

**Ninguno fallaba.** Todos hacían algo reducido, o algo distinto, en silencio.
Esa es la familia entera: **recortes y sustituciones calladas.**

## La pregunta del repaso

No es "¿funciona esta pantalla?". Los otros auditores ya responden eso. Es:

> **¿Qué haría que esta pantalla hiciera menos de lo que debe, o algo distinto,
> sin que nada avisara?**

Y la regla de oro, que es lo que de verdad cuesta: **un cero, un vacío o un
silencio nunca se dan por buenos sin comprobar de dónde vienen.** Casi todos los
defectos de arriba se presentaron como un número plausible.

## Lista de modos de fallo silencioso

Para cada pantalla, recorrer esta lista. Está escrita a partir de defectos
reales, no de imaginación.

**1. Recortes.**
- ¿Cuántas filas hay en la base y cuántas se ven? (El servidor corta en 1,000
  sin avisar.) Si lo que se ve son exactamente 1,000, ya está.
- ¿Hay un lote o un límite por omisión que pueda cortar la entrada?
- Si la pantalla consulta por tandas: techo = identificadores por tanda ×
  filas que puede devolver cada uno. ¿Se pasa de 1,000?

**2. Sustituciones.**
- ¿Hay algún texto que se pida con una variable (`t('grupo.' + clave)`)? Si el
  grupo no existe, la pantalla imprime la clave interna y parece texto.
- ¿Hay un valor por omisión que tape un dato que falta en vez de reclamarlo?

**3. Ceros y vacíos.**
- Un cero en esta pantalla, ¿puede significar "no hay" **y** "no se pudo leer"?
  (Una tabla con permisos restringidos devuelve cero filas, no un error.)
- Un estado vacío, ¿puede aparecer por un fallo de red? Si sí, está mintiendo:
  hay que distinguir "no hay nada" de "no se pudo cargar".

**4. Escrituras que se pierden.**
- ¿Se comprueba el resultado de cada escritura, o se da por hecha?
- ¿Hay un disparador o una regla de la base que pueda rechazar la escritura
  callando? (El guardián de columnas del perfil rechazaba sin que se viera.)

**5. Encontrabilidad.**
- Un dato publicado, ¿sale en **todos** los caminos por los que alguien lo
  buscaría: lista, filtros, buscador, mapa, perfil?
- ¿Hay algún campo cuya ausencia lo deje fuera de un filtro? (Sin área, sin
  país, sin nombre.)

**6. Cifras que se calculan.**
- ¿Sobre qué población se calcula? ¿Puede estar recortada? (La comparación del
  EVS se hacía contra el grupo de pares, que podía llegar cortado.)
- ¿La cifra que se imprime es la que se guardó, o una recalculada que puede
  diferir?

**7. Permisos.**
- Sin sesión, ¿qué devuelve esta pantalla? ¿Y con la sesión de otro rol?
- ¿Expone alguna columna que no haga falta para pintarla?

**8. Lo que se le dice a la persona.**
- Un error, ¿dice qué pasó y qué hacer, o sólo "algo falló"?
- Si hay campos obligatorios, ¿la pantalla dice **cuáles** faltan?

## Cómo se deja constancia

Cada repaso se anota en `repaso-adversario.json`, con los archivos que cubre y
el commit en el que estaban. `npm run revisar:adversario` cruza el registro con
las pantallas que existen y dice qué falta, qué caducó porque su código cambió
después, y qué hallazgos quedaron abiertos.

**Un repaso sin constancia es un repaso que hay que repetir.** Y una pantalla
repasada que luego se modifica vuelve a la cola: eso es lo que separa este
método de un esfuerzo que se hace una vez y se pierde.
