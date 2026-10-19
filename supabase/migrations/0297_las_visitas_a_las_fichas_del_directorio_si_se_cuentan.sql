-- Las fichas curadas del directorio se ven en la MISMA pagina que los perfiles
-- de miembro (/proveedor/:id), pero viven en otra tabla, asi que sus visitas no
-- se contaban en ninguna parte. Aqui se les da su propio registro y se enruta
-- desde la misma funcion que ya llama la pagina: la aplicacion no cambia.
create table if not exists public.directorio_eventos (
  id            bigint generated always as identity primary key,
  directorio_id uuid not null references public.directorio(id) on delete cascade,
  kind          text not null check (kind in ('view', 'contact')),
  viewer_id     uuid references auth.users(id) on delete set null,
  day           date not null default current_date,
  created_at    timestamptz not null default now()
);

create index if not exists directorio_eventos_ficha_idx
  on public.directorio_eventos (directorio_id, kind, day);

-- Dedupe diario SOLO para quien tiene sesion: a una visita anonima no se le
-- puede distinguir de otra, y contarlas todas es justo lo que se quiere medir.
create unique index if not exists directorio_eventos_dedupe_idx
  on public.directorio_eventos (directorio_id, kind, viewer_id, day)
  where viewer_id is not null;

alter table public.directorio_eventos enable row level security;

-- Sin politicas: nadie escribe ni lee la tabla directamente. Se entra por las
-- funciones, que corren con privilegios y deciden que se permite.
revoke all on public.directorio_eventos from anon, authenticated;

create or replace function public.track_profile_event(p_provider_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_viewer uuid := auth.uid();
begin
  if p_provider_id is null or p_kind not in ('view', 'contact') then
    return;
  end if;
  -- No se cuenta la autovisita del propio prestador.
  if v_viewer is not null and v_viewer = p_provider_id then
    return;
  end if;

  if exists (select 1 from public.profiles where id = p_provider_id) then
    insert into public.profile_events (provider_id, kind, viewer_id, day)
    values (p_provider_id, p_kind, v_viewer, current_date)
    on conflict do nothing;
    return;
  end if;

  -- Ficha curada del directorio: su propio registro.
  if exists (select 1 from public.directorio where id = p_provider_id) then
    insert into public.directorio_eventos (directorio_id, kind, viewer_id, day)
    values (p_provider_id, p_kind, v_viewer, current_date)
    on conflict do nothing;
  end if;
end;
$function$;
