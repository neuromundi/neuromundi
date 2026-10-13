# Despliegue rápido — Neuromundi

Guía corta para publicar cambios. El despliegue es **automático**: al hacer `git push`,
GitHub Actions compila y sube a Hostinger. No necesitas `npm run build` local.

## Pasos

1. **Guardar** los archivos modificados:
   ```
   git add <archivos>
   ```
2. **Commit** con una descripción:
   ```
   git commit -m "descripción del cambio"
   ```
3. **Push** (aquí arranca solo el despliegue):
   ```
   git push
   ```
4. **Verificar** en GitHub → pestaña **Actions**: el workflow debe quedar en **verde**.
   Si `tsc` o `vitest` fallan, NO se despliega nada (es la red de seguridad).
5. **Purgar el CDN** en hPanel de Hostinger.
   - Imprescindible si cambiaste archivos de **nombre estable** (videos, logos, imágenes).
   - Si solo tocaste código, el bundle lleva hash nuevo; purgar no hace daño.

## Qué NO va en este flujo

- **No** corras `npm run build` local para desplegar (lo hace la CI). Úsalo solo si quieres
  verificar que compila antes de subir.
- **SQL / migraciones de base de datos**: van aparte, en el SQL Editor de Supabase (o por el
  conector). El `git push` NO toca la base de datos.
- **Nunca** subas: `.env`, `node_modules`, `dist`, ni archivos sueltos en la raíz
  (p. ej. PNG de trabajo). El `.gitignore` cubre la mayoría; revísalo con `git status`.

## Verificaciones útiles antes de subir (opcionales)

- `git status` → ver qué cambió (en rojo = modificado sin agregar).
- `npm run build` → compila + regenera los `src/i18n/critical/*.crit.json` (si aparecen
  modificados, agrégalos: `git add src/i18n/critical/`). La CI igual los regenera, así que
  no es obligatorio commitearlos.

## Checklist por tipo de cambio

- **Textos (i18n)**: paridad de claves debe ser 0 en los 11 idiomas.
- **Variables `VITE_*`**: se incrustan en build; si agregaste una, configúrala también en
  los Secrets de GitHub Actions.
- **Service Worker / PWA / push**: verifica el `dist` compilado tras el build.
- **Archivos de nombre estable (video/imagen)**: purga CDN sí o sí.
