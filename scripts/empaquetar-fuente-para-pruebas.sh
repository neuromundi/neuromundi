#!/bin/sh
# Empaqueta lo que hace falta para correr las pruebas en un entorno Linux.
#
# Por qué existe: el node_modules que vive en esta carpeta es la compilación de
# WINDOWS, así que vitest y rollup no arrancan desde el puente de Linux; sólo
# funciona `tsc --noEmit`. Antes eso dejaba las pruebas en manos de GitHub
# Actions, es decir, después de empujar. Con este paquete se corren ANTES.
#
# Uso: sh scripts/empaquetar-fuente-para-pruebas.sh
# Deja fuente-para-pruebas.tar.gz (unos 2.5 MB) en la raíz del proyecto, para
# subirlo al entorno de la nube, instalar ahí con `npm ci` y correr
# `npx vitest run`, `npx tsc --noEmit` y `npx vite build`.
#
# El paquete NO lleva node_modules, .git ni public: sólo el código y las
# configuraciones. Bórrelo cuando acabe; no debe quedarse en la carpeta.
set -e
cd "$(dirname "$0")/.."
tar czf fuente-para-pruebas.tar.gz \
  src package.json package-lock.json \
  vitest.config.ts vite.config.ts tsconfig*.json \
  tailwind.config.js postcss.config.js index.html
ls -lh fuente-para-pruebas.tar.gz
