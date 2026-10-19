-- Decisión de Enyoria, 19 oct 2026: los artículos deben pasar por moderación.
--
-- Lo que había: el evento que propone un prestador espera su revisión, pero el
-- artículo salía al blog público EN EL MOMENTO, sin que nadie lo viera antes.
-- Se descubrió el 19 de octubre publicando uno de prueba desde la cuenta de
-- prestador: apareció publicado al instante. Con 1,122 invitaciones saliendo
-- el 20 de octubre, cualquiera de esos miembros podría publicar lo que quiera
-- en el blog público de Neuromundi.
--
-- Lo que hay ahora: misma mecánica que los eventos, para no aprender dos.
-- El artículo nace 'pendiente' y sin publicar, le llega el aviso, y sólo su
-- aprobación lo pone en el blog.
--
-- LO QUE YA ESTÁ PUBLICADO NO SE TOCA: la columna nace con 'aprobado' por
-- omisión, así que los 82 artículos de hoy siguen exactamente igual.
alter table public.content_posts
  add column if not exists revision text not null default 'aprobado';
alter table public.content_posts
  add column if not exists nota_admin text;
alter table public.content_posts
  add column if not exists revisada_por uuid references public.profiles(id);
alter table public.content_posts
  add column if not exists revisada_en timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint
                  where conname = 'content_posts_revision_check'
                    and conrelid = 'public.content_posts'::regclass) then
    alter table public.content_posts
      add constraint content_posts_revision_check
      check (revision in ('pendiente','aprobado','rechazado'));
  end if;
end $$;

comment on column public.content_posts.revision is
  'Estado de la revisión del administrador. Lo que ya existía nació aprobado; lo que escriba un miembro de ahora en adelante nace pendiente.';

create index if not exists content_posts_revision_pendiente_idx
  on public.content_posts (created_at desc) where revision = 'pendiente';
