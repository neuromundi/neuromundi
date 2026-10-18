-- Hasta ahora sólo los eventos en línea podían llevar enlace (online_url, que es
-- el enlace para conectarse). Un congreso presencial quedaba sin forma de mandar
-- al lector a la convocatoria y a la inscripción del organizador, que es
-- justamente lo que hace útil la sección de Eventos.
alter table public.events add column if not exists info_url text;
comment on column public.events.info_url is 'Enlace a la convocatoria o inscripción en la página del organizador. Vale para eventos presenciales y en línea; online_url sigue siendo el enlace para conectarse.';
