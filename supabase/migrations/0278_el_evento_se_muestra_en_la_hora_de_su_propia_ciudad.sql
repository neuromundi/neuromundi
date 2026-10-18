-- starts_at es un instante. Al pintarlo, el navegador lo pasaba a la zona de
-- quien mira, así que un congreso de Madrid a las 9:00 se leía «02:00» desde
-- México. Guardamos la zona horaria del evento para mostrarlo siempre en la
-- hora de su propia ciudad, y marcamos los eventos cuya convocatoria todavía
-- no publica la hora para enseñar sólo la fecha en vez de inventar una.
alter table public.events add column if not exists timezone text;
alter table public.events add column if not exists hora_confirmada boolean not null default true;
comment on column public.events.timezone is 'Zona horaria IANA del lugar del evento (por ejemplo Europe/Madrid). Nula para eventos en línea o cuando se quiera mostrar en la zona de quien lee.';
comment on column public.events.hora_confirmada is 'Falsa cuando la convocatoria aún no publica la hora: la tarjeta muestra sólo la fecha.';
