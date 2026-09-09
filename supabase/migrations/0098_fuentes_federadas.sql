-- ============================================================================
-- 0098 · Nuevas fuentes de directorio: redes federadas
--
-- Hasta ahora `fuente` solo admitía 'denue' (el directorio del INEGI) y
-- 'curado' (investigación propia, ficha por ficha). El barrido del DENUE para
-- residencias mostró su límite: de 4,445 establecimientos, dos terceras partes
-- no traen correo ni sitio, y de los sitios que sí trae, casi la mitad ya no
-- resuelve. Sirve para saber DÓNDE está algo, no para escribirle.
--
-- Las redes federadas son la fuente contraria: pocas organizaciones, pero con
-- contacto que ellas mismas publican y mantienen. Tres páginas web dieron 69
-- organizaciones con correo; el DENUE dio 4,445 fichas de las que se salvaron
-- 274.
--
-- Se nombra cada red por separado, en vez de meterlas todas bajo 'curado',
-- por dos razones: deshacer una carga es un solo DELETE, y hay que volver a
-- raspar los padrones cada tanto porque crecen.
-- ============================================================================

alter table directorio drop constraint directorio_fuente_valida;

alter table directorio add constraint directorio_fuente_valida
  check (fuente = any (array[
    'denue',              -- Directorio Estadístico Nacional de Unidades Económicas (INEGI)
    'curado',             -- investigación propia, ficha por ficha
    'fedma',              -- Federación Mexicana de Alzheimer
    'iluminemos',         -- Iluminemos por el Autismo A.C.
    'vozprosaludmental'   -- Voz Pro Salud Mental
  ]));

-- Las fichas de estas tres redes se cargaron como 'por_verificar', no como
-- 'publicado', a propósito: ninguna trae coordenada. El buscador aplica el
-- filtro de radio solo a las fichas que sí la tienen (useDirectory.ts, línea
-- 200), así que una ficha sin coordenada pasa TODOS los filtros de distancia.
-- Publicarlas hoy haría que una búsqueda "a 10 km de Guadalajara" devolviera
-- organizaciones de Chihuahua. Se publican en cuanto se geocodifiquen.
