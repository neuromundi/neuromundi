-- Sin esta línea, un artículo pendiente al que por error se le pusiera
-- is_published en true se colaría al blog. La regla pide las dos cosas.
-- El autor sigue viendo los suyos en cualquier estado, para saber en qué
-- quedaron y leer la nota si hubo rechazo.
--
-- El borrado de reglas por esta vía se queda colgado, así que se reemplaza
-- con el mismo nombre en vez de borrar y recrear.
alter policy posts_select_published on public.content_posts
  using ((is_published = true and revision = 'aprobado')
         or author_id = (select auth.uid())
         or public.is_admin());
