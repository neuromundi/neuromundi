-- Un evento en línea no se acotaba por país: aparecía en la búsqueda de los
-- doscientos y pico países de la lista. Así, un congreso virtual en español
-- salía en Portugal, donde no le sirve a nadie. Ahora puede decir a qué países
-- va dirigido; vacío o nulo sigue queriendo decir «a todos», que es lo
-- razonable para un evento realmente abierto.
alter table public.events add column if not exists paises text[] not null default '{}';
comment on column public.events.paises is 'Sólo para eventos en línea: países donde el evento es pertinente, con los nombres de la lista de países de la plataforma. Vacío = abierto a todos. Un evento presencial se acota por su propio country.';
