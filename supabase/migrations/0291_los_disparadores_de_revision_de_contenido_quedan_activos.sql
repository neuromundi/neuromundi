-- Se usa «create or replace trigger» en vez de borrar y recrear: el borrado de
-- objetos por la vía que usamos se queda colgado.
create or replace trigger contenido_nace_pendiente_tg
  before insert on public.content_posts
  for each row execute function public.contenido_nace_pendiente();

create or replace trigger editar_contenido_vuelve_a_revision_tg
  before update on public.content_posts
  for each row execute function public.editar_contenido_vuelve_a_revision();

create or replace trigger avisar_contenido_propuesto_tg
  after insert on public.content_posts
  for each row execute function public.avisar_contenido_propuesto();
