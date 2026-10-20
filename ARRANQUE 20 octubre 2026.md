# Arranque del 20 de octubre de 2026 — qué hacer, en qué orden

Escrito el 19 de octubre a las 21:15 CDMX. Todas las cifras de este documento
están **medidas**, no estimadas, salvo donde dice lo contrario.

## 1. Antes de mandar nada: comprobar el remitente y la cola

El envío tiene **ensayo en seco por omisión**. Una llamada sin `send` no manda
ningún correo: sólo informa. Úselo siempre primero.

```
POST https://sboagswcehuxwfjdbhdn.supabase.co/functions/v1/enviar-invitaciones
Cabecera:  x-cron-secret: <CRON_SECRET>
Cuerpo:    {"tanda": 1}
```

En la respuesta mire tres cosas:

- `remitente` — tiene que ser la dirección de campaña correcta.
- `total` — cuántos correos saldrían.
- `se_cortaria` — si viene `true`, el lote se partiría; `quedarian_fuera` dice
  cuántos. **Si sale `false`, la tanda cabe completa.**

## 2. Enviar: una tanda por llamada, nunca en bloque

```
Cuerpo:    {"tanda": 1, "send": true}
```

- **Siempre con `tanda`.** Una llamada sin tanda intentaría hasta mil correos y
  se quedaría a medias por el límite de tiempo de la función (ese límite no está
  medido: es estimación).
- **No hace falta poner `limit`.** Desde el 19 de octubre, cuando se pide una
  tanda el límite por omisión cubre la tanda completa. Antes era 50 siempre, y
  la tanda 6, que tiene 51, habría dejado una ficha fuera en silencio.
- La función espera 700 ms entre correo y correo: una tanda de 50 tarda unos
  **35 segundos**.
- Al terminar, la respuesta dice `enviados`, `fallidos` y `sin_procesar`. Si
  `sin_procesar` es mayor que cero, vuelva a llamar con la misma tanda.

## 3. Cuántos correos hay en cada tanda (medido el 19 de octubre, 21:00 CDMX)

Total en cola: **1,121** correos en 31 tandas.

```
 1:25   2:25   3:25   4:24   5:50   6:51   7:41   8:41   9:40  10:40
11:40  12:49  13:39  14:38  15:26  16:29  17:13  18:27  19:48  20:45
21:45  22:45  23:45  24:44  25:41  26:41  27:41  28:40  29:29  30:29
31:5
```

Las tandas 1 a 19 son el carril P y las 20 a 31 el carril E.

## 4. Congelar despliegues durante la ventana del arranque

El sitio sube por FTP a Hostinger. **No hay vuelta atrás instantánea:** volver
exige otra pasada completa de CI. Mientras la campaña esté en marcha, no se
empuja nada a `main` que no sea una corrección urgente.

Si algo se rompe, hay dos caminos, de más rápido a más lento:

1. **Subir por FTP la copia buena.** Está en
   `Copia buena del sitio/Sitio Neuromundi 20261019 commit 92e2cb7.tgz`.
   Descomprimir y subir el contenido de `dist`. No necesita CI ni compilar.
2. **Volver el repositorio a la etiqueta** `copia-buena-20261019`
   (commit `92e2cb7`) y dejar que CI despliegue.

La etiqueta está creada en local y **falta subirla**:
`git push origin copia-buena-20261019`

## 5. Si hay que restaurar datos del directorio

La tabla `directorio` no guarda historial de filas. Hay copias exactas tomadas
el 19 de octubre, dentro de la propia base:

- `respaldo_directorio_20261019` — 1,819 fichas
- `respaldo_invitaciones_20261019` — 390 invitaciones
- `respaldo_plan_invitacion_20261019` — 1,122 fichas del plan

Y una copia fuera de la base, en la carpeta:
`Respaldo clasificacion directorio Neuromundi 20261019.csv`

## 6. Qué vigila el auditor y cada cuánto

Corre **cada dos horas** (antes, una vez al día) y avisa sólo cuando un control
aparece o crece, así que más frecuencia no significa más ruido. Son **14
controles**. Dos son nuevos del 19 de octubre:

- `plan_sin_token` — fichas del plan sin token de invitación. **Éste es el que
  faltaba:** el 19 de octubre faltaban 746 de 1,122 y el envío las saltaba sin
  decir nada.
- `plan_fuera_de_cola` — fichas con token que su tanda no devuelve, por
  cualquier otro motivo.

**Importante:** el aviso llega como notificación dentro de la aplicación y
también dispara una notificación al teléfono, pero **no hay ninguna suscripción
de notificaciones registrada** (medido: cero, incluida la cuenta de
administración). Hasta que instale la aplicación y acepte las notificaciones en
la cuenta de administración, el aviso sólo se ve entrando al panel.

## 7. Lo que sigue pendiente y depende de una decisión suya

- **Tres fichas publicadas sin área**, invisibles en los filtros: Estancia
  Dorita Ojeda I.A.P. (Ciudad Obregón), Dinámica Familiar Laguna A.C.
  (Saltillo) y Pequeños Maestros (Orizaba).
- **El perfil de Sergio Edilberto Ramírez Pérez (NM-000018) no tiene país**, ni
  ningún otro dato de ubicación. No se puede rellenar sin inventarlo. El
  servidor ya rechaza altas nuevas sin país.
- **Suscribir la cuenta de administración a las notificaciones** (punto 6).

## 8. El cron `nm-campaign-emails` se queda APAGADO a propósito

Está inactivo y **así debe seguir durante el arranque.** No es el que manda las
invitaciones del directorio: ése (`enviar-invitaciones`) no tiene cron a
propósito y sólo sale cuando usted lo llama.

Lo que hace `campaign-emails` es mandar, **por su cuenta y sin que nadie pulse
nada**, el correo de bienvenida a cada perfil pre-registrado y un recordatorio
cada cinco días a quien no ha cubierto su cuota. Dos razones para dejarlo
apagado:

1. Manda correos a terceros de forma automática, y la regla permanente es que
   nada sale a terceros sin su aprobación expresa, caso por caso.
2. Medido hoy: si se encendiera ahora saldrían **3 bienvenidas y 0
   recordatorios**, y esos 3 perfiles son cuentas de prueba.

Enciéndalo cuando haya altas reales y usted decida que la secuencia automática
le parece bien: `select cron.alter_job((select jobid from cron.job where
jobname='nm-campaign-emails'), active := true);`

## 9. Carga del directorio: medida, corregida y vuelta a medir

Prueba contra producción con visitantes simultáneos de verdad, antes y después
de pedir sólo las columnas que la pantalla usa:

| Visitantes a la vez | Antes | Después | Fallidas |
|---|---|---|---|
| 1  | 1.26 s | **1.09 s** | 0 |
| 10 | 6.68 s | **1.72 s** | 0 |
| 25 | 7.23 s | **2.64 s** | 0 |
| 50 | 7.55 s | **5.24 s** | 0 |

**Cero fallos en los ocho casos.** Con diez visitantes a la vez, que es la carga
realista del primer día, el directorio pasa de **6.7 a 1.7 segundos**.

La causa estaba medida: la pantalla pedía las **73 columnas** de las fichas
(`select('*')`), **1,750 KB por visitante**. Ahora pide las **33** que de verdad
usan los nueve filtros, el orden, la tarjeta y el mapa: **876 KB**, la mitad de
peso y 39 % menos tiempo en una sola petición.

La lista vive en `COLUMNAS_DIRECTORIO`, en `src/types/app.ts`, y el tipo de la
lista del directorio se construye con `Pick` sobre ella. **Si alguien usa un
campo que no se pide, el compilador lo detiene**, en vez de dejar un hueco en
blanco en la pantalla que nadie ve. Para añadir un campo a la tarjeta hay que
añadirlo también a esa lista.

`PerfilPublico` sigue siendo la fila completa: el perfil del prestador y la
página de inclusión escolar leen la misma vista con sus propias consultas y sí
necesitan teléfono, dirección y número de miembro. El recorte es sólo de la
lista, que trae mil fichas de golpe.

La prueba está en `scripts/revision/prueba de carga del directorio.py`: se
vuelve a medir en un minuto en vez de discutirse.
