-- El alta de contenido se hace con un insert directo desde la aplicación, no
-- por una función como en los eventos. Para no reescribir ese camino entero a
-- días del arranque, el estado se fija aquí: el resultado es el mismo y no
-- depende de que el cliente se porte bien.
create or replace function public.contenido_nace_pendiente()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  -- El administrador publica directo; quien no lo es, propone.
  if not public.is_admin() then
    new.revision     := 'pendiente';
    new.is_published := false;
    new.nota_admin   := null;
    new.revisada_por := null;
    new.revisada_en  := null;
  end if;
  return new;
end $$;

-- SIN ESTO LA MODERACIÓN SERÍA TEATRO: alguien podría mandar a revisión un
-- texto inocuo, esperar la aprobación y luego reescribirlo entero. Cualquier
-- cambio al contenido devuelve el artículo a revisión y lo saca del blog.
-- Cambiar sólo is_published (ocultar o volver a mostrar lo ya aprobado) no
-- cuenta como edición: eso el autor lo puede hacer cuando quiera.
create or replace function public.editar_contenido_vuelve_a_revision()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.title           is distinct from old.title
     or new.body         is distinct from old.body
     or new.excerpt      is distinct from old.excerpt
     or new.external_url is distinct from old.external_url
     or new.cover_url    is distinct from old.cover_url
     or new.topic        is distinct from old.topic
     or new.type         is distinct from old.type
     or new.keywords     is distinct from old.keywords
     or new.sections     is distinct from old.sections then
    new.revision     := 'pendiente';
    new.is_published := false;
    new.revisada_por := null;
    new.revisada_en  := null;
  end if;
  return new;
end $$;

-- Aviso al administrador, igual que con los eventos.
create or replace function public.avisar_contenido_propuesto()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.revision = 'pendiente' then
    perform public.notify_admins(
      'contenido_propuesto',
      'Un miembro propuso un artículo',
      coalesce(new.title, 'Un artículo') || ' espera su revisión.',
      jsonb_build_object('contenido_id', new.id, 'titulo', coalesce(new.title,''))
    );
  end if;
  return null;
end $$;
