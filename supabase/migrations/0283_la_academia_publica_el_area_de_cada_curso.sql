-- courses_public es la vista que lee la academia (segmenta por país en el
-- servidor). Sin esta columna el curso llevaría su área en la tabla pero el
-- catálogo no la vería, así que el filtro no podría funcionar.
--
-- La columna va al FINAL del select: create or replace view no permite
-- insertar ni reordenar columnas (error 42P16).
create or replace view public.courses_public as
 select c.id,
    c.author_id,
    c.title,
    c.description,
    c.cover_url,
    c.level,
    c.is_published,
    c.created_at,
    c.audience,
    c.country,
    coalesce(c.country, p.country) as effective_country,
    c.sections
   from public.courses c
     left join public.profiles p on p.id = c.author_id;

alter view public.courses_public set (security_invoker = true);
