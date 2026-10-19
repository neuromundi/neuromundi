-- Las 1,819 fichas curadas del directorio NO tienen perfil de miembro: sus
-- identificadores no existen en profiles. Cada visita a una de ellas intentaba
-- insertar en profile_events y chocaba contra la llave foranea, de modo que la
-- llamada fallaba por completo. Medido el 19 de octubre de 2026: 12 choques en
-- un solo dia y profile_events con CERO registros historicos.
-- Ahora, si el identificador no corresponde a un perfil, no se cuenta y no se
-- rompe nada. Las visitas a fichas de miembros si quedan registradas.
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
  -- Solo se cuentan perfiles de miembros: las fichas curadas del directorio
  -- viven en otra tabla y no tienen fila en profiles.
  if not exists (select 1 from public.profiles where id = p_provider_id) then
    return;
  end if;
  insert into public.profile_events (provider_id, kind, viewer_id, day)
  values (p_provider_id, p_kind, v_viewer, current_date)
  on conflict do nothing;  -- dedupe diario para miembros con sesion
end;
$function$;
