# Informe de traspaso — sesión "script de invitaciones"

**Fecha:** 2026-09-08
**Origen:** sesión de Cowork enfocada en el script de invitaciones por lote
**Para:** la sesión que trabaja el directorio y las invitaciones por reclamo (0091–0094)
**Estado:** sin cambios aplicados en base de datos. Solo dos archivos nuevos en el repo.

---

## 1. Qué cambió en el repo

| Archivo | Estado | Qué es |
|---|---|---|
| `scripts/invite-providers.mjs` | **nuevo**, sin rastrear en git | Script de invitaciones corregido. Ver §5: probablemente ya no aplica. |
| `_archivo/diagnostico_auth_importados_20260908.sql` | **nuevo**, sin rastrear | Diagnóstico + SQL de reparación. **No es migración para aplicar.** |

**`supabase/migrations/` quedó exactamente como estaba.** Se escribió por error un
`0091_reparar_usuarios_importados.sql` (número duplicado, antes de ver que 0091 ya
existía). No sobrescribió nada — los nombres eran distintos — y ya se eliminó.
`0091_directorio_fichas_sin_cuenta.sql` está intacto.

## 2. Qué NO se hizo

- No se aplicó ninguna migración.
- No se escribió nada en la base de datos: solo `select`.
- No se corrió el script de invitaciones. La única corrida fue con `DRY_RUN=1`.
- No se hizo commit de nada.

---

## 3. Falsa alarma que conviene descartar

Durante la sesión se detectó que los proveedores publicados pasaron de **587 a 232**
en cuestión de minutos, y se levantó como posible incidente de pérdida de datos. **Era
trabajo de la migración 0092**, y está bien hecho: mueve los 355 proveedores con correo
inventado (`@preview.neuromundi.com`) a `public.directorio` conservando su `id`, y
verifica la copia antes de borrar.

Se descartó cron, migraciones conocidas y la API de Auth porque el borrado no dejó
rastro en ninguno de esos lugares — lo cual es coherente con un `delete` por SQL directo.
**No hay incidente. No hace falta restaurar nada.**

---

## 4. Hallazgo real y no resuelto: las 232 cuentas que quedan no pueden iniciar sesión

Las cuentas que sobrevivieron a la 0092 tienen correos de **dominio real**, pero sus
filas en `auth.users` están malformadas: se insertaron por SQL saltándose GoTrue.

| Defecto | Cuentas afectadas |
|---|---|
| `instance_id` en NULL (debe ser `00000000-0000-0000-0000-000000000000`) | 232 de 237 |
| Sin fila en `auth.identities` con `provider='email'` | 232 de 237 |
| `confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change` en NULL (GoTrue los lee como `string` de Go) | las mismas 232 |

**Consecuencia medida, no teórica:**

- `supabase.auth.admin.listUsers()` devuelve **5 de 237**. La Admin API filtra por
  `instance_id`, así que esas cuentas le son invisibles.
- Por lo mismo, `generateLink()` no las encuentra.
- Sin fila en `auth.identities` no hay autenticación por correo posible — ni siquiera
  para fijar contraseña por primera vez.
- **Solo 4 usuarios en todo el proyecto han iniciado sesión alguna vez.**

Esto se descubrió porque la prueba en seco del script listó 232 veces `(sin email)`
mientras SQL confirmaba que los 233 perfiles sí tenían correo. El correo estaba; lo que
faltaba era que GoTrue pudiera ver la cuenta.

### Decisión que hay que tomar en ese hilo

El enfoque de la 0093 —la cuenta nace cuando la persona acepta el token— hace
innecesario reparar cuentas que nadie pidió. Entonces:

- **Si esas 232 van a volverse fichas de `public.directorio`** como las 355 anteriores,
  el SQL de reparación sobra: bastaría extender la lógica de la 0092.
- **Si deben seguir siendo cuentas**, hay que repararlas o nunca podrán entrar. El SQL
  está listo en `_archivo/diagnostico_auth_importados_20260908.sql` (renumerar al
  siguiente libre; trae `select` de verificación al final).

Mientras no se resuelva, esas 232 fichas se ven en el directorio pero sus dueños no
pueden reclamar ni administrar nada.

---

## 5. Estado del script de invitaciones

`scripts/invite-providers.mjs` se corrigió (tenía dos bugs propios: pedía una columna
`email` que no existe en `profiles`, y apuntaba el redirect al dominio sin `www`).
Funciona en el sentido de que ya no revienta.

**Pero su premisa quedó obsoleta con la 0093.** El script genera enlaces de recuperación
para cuentas pre-creadas; la 0093 hace justo lo contrario y mejor: invitación por token,
la cuenta nace al aceptar, y el mismo enlace ofrece darse de baja. **No correrlo sin
decidir antes si sigue teniendo lugar.** Si la respuesta es que no, se puede borrar.

---

## 6. Observación por verificar (no confirmada)

Durante la sesión, una pestaña que se quedó en el **apex** (`neuromundi.com`, sin `www`)
sirvió un `index.html` que apuntaba a un bundle viejo, mientras `www.neuromundi.com`
servía el actual. Otra pestaña navegando al apex **sí** redirigió a `www` correctamente.

No pude reproducirlo de forma concluyente —CORS y el proxy del entorno lo impiden— y
`CLAUDE.md` documenta que `.htaccess` redirige apex → `www`. **Lo dejo como algo que vale
la pena comprobar desde una terminal con red libre**, no como conclusión:

```
curl -sI https://neuromundi.com/
curl -s  https://neuromundi.com/ | grep -o '/assets/index-[^"]*\.js'
curl -s  https://www.neuromundi.com/ | grep -o '/assets/index-[^"]*\.js'
```

Si los dos bundles no coinciden, quien entre sin `www` está viendo una versión vieja —
y eso importa para el flujo de reclamo, porque el `code_verifier` de PKCE vive en el
`localStorage` del host donde arranca el login.

---

## 7. Consultas para reproducir el hallazgo principal

```sql
-- Salud de las filas de auth
select
  count(*)                                                  as total,
  count(*) filter (where instance_id is null)               as instance_null,
  count(*) filter (where not exists (
    select 1 from auth.identities i where i.user_id = u.id)) as sin_identidad,
  count(*) filter (where confirmation_token is null
                      or recovery_token is null
                      or email_change_token_new is null
                      or email_change is null)              as tokens_null,
  count(*) filter (where last_sign_in_at is not null)        as han_entrado
from auth.users u;

-- Confirmar que ya no quedan correos inventados
select count(*) from auth.users where email like '%@preview.neuromundi.com';
```
