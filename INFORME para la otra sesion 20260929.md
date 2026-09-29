# Traspaso · sesión de directorio — 29 sep 2026, 15:40 CDMX

Para la otra sesión de Claude que trabaja Neuromundi. Esto es lo que cambié hoy
en la base de datos y en el repo, y lo que dejé pendiente.

---

## 1. Lo que hay que saber antes de nada

**`public.profiles` tiene 95 columnas y la vista `directorio_publico` estaba
escrita para 94.** Alguien añadió `membership_period` (posición 93, entre
`neuro_conditions` y `year_started`) sin añadirlo a la rama de fichas de la
vista. La vista seguía funcionando porque una vista es una foto del momento en
que se creó, pero **cualquier intento de recrearla fallaba** con:

```
ERROR: 42601: each UNION query must have the same number of columns
```

y ese error no dice cuál es la columna que falta. Lo descubrí probando la unión
en una vista desechable antes de tocar la de producción. Ya está corregido.

Para que no vuelva a pasar en silencio, la migración 0137 incluye una guarda que
cuenta las columnas de `profiles` y aborta con un mensaje explícito si no son 95.
**Si añades una columna a `profiles`, añade su equivalente a la rama de fichas en
la misma posición ordinal y sube el número de la guarda.**

---

## 2. Migración 0137 — aplicada en producción

`supabase/migrations/0137_clasificar_fichas_catalogo.sql`

### El problema

`directorio_publico` devolvía, para las 728 fichas:

```sql
NULL::text   as profession
'{}'::text[] as specialties
'{}'::text[] as intervention_areas
'{}'::text[] as neuro_conditions
```

`useDirectory` filtra especialidad contra `specialties` / `intervention_areas` y
el acceso rápido contra `profession` más esas listas. Con arreglos vacíos, **todo
filtro de especialidad devolvía cero fichas**: las 317 claves de los catálogos de
`src/data/` estaban en cero. El único resultado al buscar "sombra" era ADIGS, y
salía por coincidencia de texto en su NOMBRE, no por estar clasificado.

### Lo que hace

1. Añade a `directorio`: `profession`, `specialties`, `intervention_areas`,
   `neuro_conditions`, `clasificacion_auto`.
2. Crea `public.directorio_reglas_clasificacion`: tabla de reglas
   (destino, clave, patrón, prioridad), 97 filas. **Es tabla y no código a
   propósito.** Cuando el catálogo crezca, añades filas y vuelves a correr la
   función, sin otra migración.
3. Crea `public.clasificar_directorio(p_forzar boolean)`. Lee
   `nombre + especializacion + clase_scian` en minúsculas y aplica las reglas.
   `profession` es valor único y gana la prioridad más baja (neuropediatría antes
   que neurología, si no todo neuropediatra acababa como neurólogo).
   **`notas` queda fuera a propósito**: ahí van advertencias de curaduría
   ("categoría vacía: equinoterapia", "sin confirmar"), y clasificar por ellas
   marcaría fichas por lo que les falta en vez de por lo que ofrecen.
4. Rehace `directorio_publico` para exponer las columnas reales.

### `clasificacion_auto`

`true` = lo puso la función. Si corriges una ficha a mano, **pon
`clasificacion_auto = false`** y la función ya no la vuelve a tocar.
`clasificar_directorio(true)` fuerza a todas; sin argumento solo toca las
automáticas y las que nunca se clasificaron.

### Resultado medido

| | antes | después |
|---|---|---|
| Fichas con `profession` | 0 | 559 |
| Fichas con `specialties` | 0 | 409 |
| Fichas con `intervention_areas` | 0 | 384 |
| Fichas con `neuro_conditions` | 0 | 111 |
| Sin clasificar (de 1026) | 1026 | 244 |

Filtros sobre la vista pública, comprobados uno por uno: TEA 131, TDAH 41,
epilepsia 20, equinoterapia 10, hidroterapia 10, ABA 8, acompañante terapéutico 1.
Antes todos daban 0.

Las 244 sin clasificar son sobre todo fichas DENUE con nombre genérico y sin
`especializacion`. No inventé nada para ellas.

### Lo que NO hace

- No inventa `age_ranges` ni `modalities`: el texto curado no los sostiene.
- No toca `sections` ni `ambito`.
- No publica nada. Las fichas en `por_verificar` siguen fuera de la vista.

---

## 3. Cambio en el front

`src/hooks/useDirectory.ts`

El *haystack* de la búsqueda de texto libre **no incluía `services_offered`**,
que es donde la vista mapea `directorio.especializacion`. Es decir: el texto que
describe a 669 fichas no era buscable y solo se encontraban por nombre. Añadí
`services_offered` y las etiquetas de `neuro_conditions`.

**No pude correr `npm run build`.** El `node_modules` del repo está instalado para
Windows y mi shell corre en un Linux aislado: rollup falla con
`Cannot find module @rollup/rollup-linux-x64-gnu`. No reinstalé para no romper el
`node_modules` de Enyoria. **Hay que compilar en Windows antes de desplegar.**
Los tipos los verifiqué contra `src/types/database.ts`: `services_offered` y
`neuro_conditions` existen en `Tables<'profiles'>`.

---

## 4. Orden de migraciones — ojo

Cuando apliqué la 0137, la base estaba en **0134** y el repo ya tenía **0135
(`catalog_suggestions`)** y **0136 (`admin_create_category`)** sin aplicar. No las
apliqué: son tuyas y no sabía si estabas a medias. Revisé que ninguna toque
`directorio_publico`, así que son independientes de la mía.

Consecuencia: en `supabase_migrations.schema_migrations` la 0137 quedó con un
*timestamp* anterior al que tendrán la 0135 y la 0136 cuando las apliques. El
orden del ledger queda 0134 → 0137 → 0135 → 0136. Funcionalmente da igual porque
no se tocan, pero si usas `supabase db push` puede quejarse de orden.

---

## 5. 278 fichas nuevas en `por_verificar`

Investigación de candidatos en 14 estados (Querétaro 63, SLP 20, Aguascalientes
20, BCS 20, Durango 19, Tabasco 18, Morelos 17, Colima 16, Quintana Roo 15,
Sonora 15, Tlaxcala 15, Zacatecas 14, Nayarit 14, Campeche 12).

- `fuente = 'curado'`, `estado_revision = 'por_verificar'`, `notas` termina en
  `candidato investigación 2026-09` — ese texto las identifica a todas.
- **Están en `por_verificar` a propósito.** Muchas son personas físicas sacadas
  de Doctoralia que no han consentido aparecer en un directorio público, y varias
  traen datos que el agente marcó como sin confirmar. No las publiques en bloque.
- **0 invitaciones creadas y 0 enviadas.** Los crons siguen apagados. Enyoria no
  ha autorizado ningún envío.
- Cada salvedad está en `notas`: teléfonos con lada de otro estado, sedes
  principales en otro estado, organizaciones con clausura reportada, datos que
  vienen de directorios de terceros.

El detalle completo, con reseñas y fuentes, está en
`Candidatos Neuromundi por estado.xlsx`, una hoja por estado.

---

## 6. Pendientes que dejo abiertos

1. **`sections` no discrimina.** 728 fichas en neurodesarrollo, 726 en
   neurodivergencias, 721 en afecciones: prácticamente todas están en las tres,
   así que el filtro por sección no separa nada. No lo toqué porque corregirlo
   saca fichas de secciones y es una decisión de producto, no técnica. Ahora que
   existen `specialties` y `neuro_conditions`, se puede derivar bien.
2. **244 fichas sin clasificar.** Necesitan `especializacion` o una regla nueva.
3. **Categorías todavía en cero**: turismo accesible, tecnología de apoyo / CAA,
   odontología especializada. Los 14 agentes las buscaron en todo el país y no
   encontraron proveedores mexicanos privados.
4. **Regenerar los tipos de Supabase** después de la 0137: `directorio` ganó
   cinco columnas.
5. `provider_types` sigue sin estar en `database.ts`; `useDirectory` lo resuelve
   con un cast en línea desde la 0097.
