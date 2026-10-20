# Revisión automática de Neuromundi

Estos revisores existen porque el 19 de octubre de 2026 cinco defectos reales
—uno de ellos bloqueaba TODOS los registros por Google— no se encontraron
buscándolos, sino tropezando con ellos. Todos habían dejado rastro medible.

Cada revisor **sólo reporta lo que puede probar**. Un vigía con falsas alarmas
se deja de leer a la semana, y entonces no protege nada.

## Cómo se usan

```

node scripts/revision/revisar-base.mjs     # base de datos
node scripts/revision/revisar-textos.mjs   # textos y traducciones
node scripts/revision/revisar-pantallas.mjs --todo   # recorrido con navegador
```

Cada uno sale con código 1 si encuentra algo, para poder encadenarlos.

## Qué revisa cada uno

**revisar-base.mjs** — contrasta lo que la aplicación escribe contra lo que la
base permite, sin ejecutar nada: funciones llamadas que no existen, tablas o
vistas inexistentes, columnas que no existen y columnas de `profiles` que el
disparador `protect_profile_columns` rechaza. Este último es exactamente el
defecto que bloqueó el alta social.

El esquema lo lee de `src/types/database.ts`, que genera Supabase y ya está
versionado: así no trabaja nunca con una foto vieja. La lista del disparador
sí es una copia (`columnas-permitidas-perfiles.json`) y el revisor avisa solo
cuando tiene más de 30 días.

**revisar-textos.mjs** — claves de texto usadas en el código que no existen,
idiomas a los que les faltan claves, y traducciones que quedaron en español en
idiomas de otro alfabeto. Ignora marcas, nombres propios y cadenas que sólo
llevan huecos de sustitución, porque ésas son iguales a propósito.

**revisar-formularios.mjs** — campos que el esquema exige y el formulario
nunca dibuja ni rellena, y campos que dibuja y el esquema no conoce. Es la
firma exacta del defecto que bloqueó el alta social. Cuando los valores
iniciales llegan desde otro módulo no puede verlos: lo dice en vez de callarlo,
y esos casos se cubren con una prueba automática.

**revisar-pantallas.mjs** — abre la plataforma en un navegador real y recorre
30 pantallas públicas, y con `--privadas` seis más que exigen sesión (panel,
ajustes, calendario, mensajes, mi ID y el curso de bienvenida). La sesión la
aporta quien ejecuta el revisor en la variable `NM_SESION`: Claude no teclea
contraseñas en producción, así que no puede entrar por su cuenta anotando errores de consola, peticiones fallidas,
pantallas en blanco y claves de texto crudas. Con `--url` se apunta a una copia
local; con la variable `NAVEGADOR` se indica dónde está Chromium.

## El vigía que corre solo

Además de estos, la base ejecuta cada mañana a las 07:52 de Ciudad de México
`auditoria_diaria()`, que revisa invariantes de los datos y avisa a
administración **sólo si algo apareció o creció** respecto al día anterior.
Para ver qué diría ahora mismo, sin esperar:

```sql
select public.auditoria_plataforma() ;  -- todo, con sus números
select public.auditoria_diaria();       -- lo que avisaría hoy
```

## Auditor 5 — conteos: ¿lo que se ve es todo lo que hay?

```
npm run revisar:conteos                       # base contra pantalla (abre navegador)
node scripts/revision/revisar-conteos.mjs --solo-estatico   # sólo el análisis de código
```

**Por qué existe.** El 19 de octubre de 2026 el directorio mostraba 1,000
fichas de las 1,818 publicadas: 818 invisibles, el 45 %, sin un solo error. El
servidor devuelve como máximo mil filas por petición y lo hace **en silencio**.
Los otros cuatro auditores no podían verlo: comprueban que la base cumpla sus
reglas, que los textos existan, que los formularios validen y que la pantalla
cargue sin caerse. **Ninguno comparaba cuántas filas hay con cuántas se ven.**

Y no era un despiste suelto. Casi todos los defectos de esa jornada eran
**recortes callados**: el envío cortaba a 50 sin decirlo, la cola saltaba 746
fichas sin token sin decirlo, la consulta de categorías podía cortar a mil sin
decirlo. Un recorte callado no se detecta mirando una sola fuente: hay que
comparar **dos fuentes independientes** y exigir que cuadren.

**Qué hace.**

1. **Conteo de punta a punta.** Para cada pantalla de lista, pregunta al
   servidor cuántas filas existen con los mismos filtros, abre la pantalla en
   un navegador de verdad, cuenta lo que pinta y exige que coincidan. Si lo que
   se ve son exactamente 1,000, lo dice: es la firma del tope.
2. **Topes sin paginar**, sin navegador: busca lecturas de tablas que pueden
   pasar de mil filas sin pedir páginas, y lotes cuyo techo (identificadores
   por lote × filas por identificador) puede pasarse del tope.

**Cuando un techo ya se calculó**, se acepta dejándolo escrito junto a la
consulta: un comentario `techo-comprobado: 140 x 7 = 980 < 1,000`. Así el
revisor no grita siempre por lo mismo y la cuenta queda a la vista de quien lea
el código, no en la cabeza de alguien.

**Una lección que costó dos falsos positivos:** un analizador que lee el código
como texto **tiene que borrar los comentarios antes**. Un punto y coma dentro de
un comentario cortaba la cadena de la consulta y el revisor denunciaba una
consulta que sí estaba paginada; un ejemplo escrito en la documentación de un
ayudante hacía que el revisor de base denunciara una tabla inexistente. Los dos
revisores ya los borran.

## Auditor 6 — redacción: ¿está bien escrito lo que lee la persona?

```
npm run revisar:redaccion
node scripts/revision/revisar-redaccion.mjs --idioma es
```

**Por qué existe.** El panel de administración llevaba semanas diciendo
"Ubicacion", "Accion", "Telefono", "membresia" y "Como se le pago": 19 textos
sin acentos. Y el panel familiar decía "Foros de la Neurocamps", con el artículo
que quedó de cuando se llamaba "la Tribu": 88 textos en seis idiomas. **Los
encontré leyendo**, que es justo lo que no escala. Los otros auditores
comprueban que el texto exista y esté en todos los idiomas; ninguno comprobaba
que esté bien escrito.

**Sin diccionario, a propósito.** No hay corrector de español instalado, y
pedir uno habría dejado el revisor sin correr en la máquina de alguien.

**Qué comprueba:** palabras que no existen sin su acento (lista corta y
cerrada); las terminaciones `-cion` y `-sion`; un artículo delante de la marca
cuando cierra la frase; mezcla de tuteo y usted dentro de un mismo grupo; y
erratas mecánicas (espacios dobles, espacio antes de un signo, interrogaciones
y exclamaciones sin abrir, paréntesis sin cerrar).

**Lo que este revisor NO hace, y por qué importa.** Su primera versión era más
ambiciosa y era peor. Comparaba cada palabra consigo misma: si "Teléfono"
aparecía 40 veces y "Telefono" una, denunciaba la una. Dio cuatro avisos y **los
cuatro eran falsos**: en español hay decenas de pares donde las dos formas son
correctas ("se prorroga" contra "la prórroga", "la campana" que suena contra "la
campaña" que se lanza, "me quedo" contra "quedó"). También probé reglas para el
condicional y el futuro, y dieron cinco avisos falsos más, porque `-arias` vale
para "retirarías" y para "hereditarias", y `-eran` para "esperarán" y para
"esperan". **Las quité en vez de dejarlas haciendo ruido.** Un revisor que grita
sin razón se aprende a ignorar, y entonces no sirve para nada.

Por la misma razón hay dos listas de excepciones escritas en el propio guión:
`TERCERA_PERSONA`, para textos donde "su" o "le" se refieren a alguien que no es
quien lee ("el vendedor **le** paga al promotor"), y la regla de marca por
idioma, porque en portugués "a Neuromundi" es correcto y así ha estado siempre.
**La excepción se escribe donde se ve, no se recuerda.**

## Auditor 7 — trazado: ¿cada ficha publicada se puede encontrar?

```
npm run revisar:trazado
node scripts/revision/revisar-trazado.mjs --sin-navegador
node scripts/revision/revisar-trazado.mjs --muestra 10
```

**Por qué existe.** Había quince fichas **publicadas** que no aparecían en
ningún filtro del directorio porque no tenían área. Y 746 fichas del plan de
invitaciones que no podían recibir su correo porque les faltaba el token. En los
dos casos el dato existía, estaba marcado como publicado, y **no llegaba a los
ojos de quien lo buscaba.** "Publicada" no significa "encontrable", y esa
diferencia es invisible mirando una sola capa.

Sigue las 1,818 fichas publicadas, una por una, y exige de cada una: que esté en
la consulta base del directorio, que tenga área, país y nombre (sin cualquiera
de los tres queda fuera de un filtro), y que si está en el plan de invitaciones
tenga token y su tanda la devuelva. Sobre una muestra, además, abre su perfil en
un navegador y comprueba que su nombre se ve.

**Necesita Playwright para la parte de navegador**, que no está instalado en la
máquina de Enyoria: sin él **lo dice** y hace el resto. No se da por bueno lo
que no se midió.

## Auditor 8 — repaso adversario: lo que nadie formuló

```
npm run revisar:adversario
node scripts/revision/revisar-adversario.mjs --pendientes
```

**Por qué existe.** Los siete auditores anteriores comprueban cosas que alguien
supo formular. Los defectos del 19 de octubre tenían **todos la misma forma** y
ninguno estaba formulado: recortes y sustituciones calladas. Los encontré
leyendo, uno por uno. Eso funcionó y no sirve, porque depende de que alguien
pase por ahí. **Un auditor escrito por quien escribió el código comprueba lo que
su autor esperaba, y por definición no puede ver lo que su autor no se planteó.**

Este guión no lee la mente de nadie: **lleva la cuenta.** Enumera las 81
pantallas y secciones que existen, las cruza con el registro de repasos y dice
qué no se ha repasado nunca, qué repaso **caducó porque su código cambió
después**, y qué hallazgos quedaron abiertos. Esa última parte es la que
convierte un día de lectura en un inventario que se puede retomar.

El método y la lista de modos de fallo silencioso —escrita a partir de defectos
reales, no de imaginación— están en `REPASO-ADVERSARIO.md`.

**Al 19 de octubre de 2026: 8 de 81 repasadas.** Se anota sólo lo que de verdad
se repasó con la lista. Un recorrido en navegador que comprueba que la pantalla
carga **no** es un repaso adversario: eso ya lo hace el auditor 3. Apuntar como
repasado algo que no se repasó es peor que no apuntar nada.
