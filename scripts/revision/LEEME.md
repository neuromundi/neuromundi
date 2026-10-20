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
