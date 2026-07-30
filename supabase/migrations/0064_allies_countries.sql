-- 0064_allies_countries.sql
-- Segmentación por país de los logos del carrusel de aliados.
--
-- Antes, TODOS los aliados activos se mostraban en el carrusel del home para
-- cualquier visitante. Ahora el admin puede acotar en qué países se ve cada
-- aliado, para no mostrar aliados que no existen en un país concreto.
--
--   allies.countries text[]  → lista de países (nombre canónico en español,
--     igual que profiles.country y el selector de país del home).
--     NULL o arreglo vacío = "todos los países" (comportamiento anterior).
--
-- El filtrado se hace en el cliente (la lista de aliados es pequeña y la lectura
-- es pública). Idempotente.

alter table public.allies
  add column if not exists countries text[];

comment on column public.allies.countries is
  'Países (nombre canónico ES) donde se muestra el aliado en el carrusel. NULL/vacío = todos.';
