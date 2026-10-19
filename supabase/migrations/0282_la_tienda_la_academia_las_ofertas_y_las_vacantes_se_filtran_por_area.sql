-- El directorio, el blog, los eventos y la Tribu ya se ordenan por las tres
-- áreas de Neuromundi. La tienda, la academia, las ofertas y las vacantes no:
-- quien entraba buscando apoyo para epilepsia tenía que leerse el catálogo
-- entero. Y el comentario de cabecera de la tienda ya PROMETÍA ese filtro, que
-- nunca se construyó.
--
-- Se hace ahora porque las cuatro tablas están vacías (medido: 0 filas en
-- products, courses, offers y job_openings). Después del arranque habría que
-- clasificar a mano lo que los miembros ya hubieran subido.
--
-- Lista vacía '{}' significa «sin clasificar», y los filtros la muestran
-- siempre: un campo nuevo no esconde lo que nadie ha etiquetado todavía.
alter table public.products      add column if not exists sections text[] not null default '{}';
alter table public.courses       add column if not exists sections text[] not null default '{}';
alter table public.offers        add column if not exists sections text[] not null default '{}';
alter table public.job_openings  add column if not exists sections text[] not null default '{}';

create index if not exists products_sections_idx     on public.products     using gin (sections);
create index if not exists courses_sections_idx      on public.courses      using gin (sections);
create index if not exists offers_sections_idx       on public.offers       using gin (sections);
create index if not exists job_openings_sections_idx on public.job_openings using gin (sections);
