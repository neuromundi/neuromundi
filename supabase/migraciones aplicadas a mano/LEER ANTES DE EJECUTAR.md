# Migraciones de datos ya aplicadas a mano

Los archivos de esta carpeta **ya se ejecutaron una vez** sobre la base de
produccion y **no deben volver a ejecutarse nunca**. No son cambios de
esquema: son migraciones de datos de un solo uso, y repetirlas destruye
informacion viva.

Se sacaron de `supabase/migrations/` el 16 de octubre de 2026 justamente para
que `supabase db push` no pueda alcanzarlas.

| Archivo | Que hace si se vuelve a ejecutar |
|---|---|
| `0092_migrar_correos_inventados.sql` | Reescribe correos de fichas que hoy ya tienen correo real. |
| `0095_cuentas_rotas_a_fichas.sql` | Convierte cuentas vivas en fichas sin cuenta. |
| `0097b_una_ficha_por_organizacion.sql` | **Borra fichas del directorio** al deduplicar por organizacion. El directorio tiene hoy mas de mil doscientas fichas. |

Las tres quedaron registradas en `supabase_migrations.schema_migrations`
con sus versiones `0092`, `0095` y `0097`, de modo que incluso si alguien
devolviera los archivos a `supabase/migrations/`, el CLI las daria por
aplicadas y no las correria.

Se conservan aqui unicamente como historia: para saber que le paso a los
datos y cuando.
