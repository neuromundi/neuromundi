-- 0331. Quien reclama su ficha y no la publica ese mismo dia, no vuelve.
-- Medido el 29 oct 2026 sobre los tres reclamos reales: el unico que publico
-- lo hizo en el mismo minuto; los otros dos no han vuelto a entrar en ocho y
-- seis dias. No existia ninguna funcion que los llamara de vuelta:
-- send-reminders solo atiende citas.
--
-- Tres avisos: a los 2 dias, a los 7 y a los 15. Uno por etapa y por persona,
-- y la tabla lo garantiza con su clave primaria.

create table if not exists public.recordatorios_publicacion (
  user_id uuid not null references public.profiles(id) on delete cascade,
  etapa smallint not null check (etapa in (2, 7, 15)),
  enviado_en timestamptz not null default now(),
  primary key (user_id, etapa)
);

comment on table public.recordatorios_publicacion is
  'Un renglon por aviso de "le falta publicar su perfil" ya enviado. La clave primaria impide repetir una etapa.';

alter table public.recordatorios_publicacion enable row level security;

-- Regla 0 del proyecto: toda tabla nueva necesita GRANT explicito.
grant select on public.recordatorios_publicacion to authenticated;
grant all    on public.recordatorios_publicacion to service_role;

do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'recordatorios_publicacion'
       and policyname = 'admin_lee_recordatorios'
  ) then
    create policy admin_lee_recordatorios on public.recordatorios_publicacion
      for select to authenticated using (public.is_admin());
  end if;
end $$;

create or replace function public.cola_recordatorio_publicacion()
 returns table (user_id uuid, correo text, nombre text, pais text, etapa smallint, faltantes text[])
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select p.id, u.email, coalesce(p.business_name, p.full_name), p.country,
         case when now() >= d.reclamada_en + interval '15 days' then 15
              when now() >= d.reclamada_en + interval '7 days'  then 7
              else 2 end::smallint as etapa,
         array_remove(array[
           case when btrim(coalesce(p.bio,''))     = '' then 'descripcion' end,
           case when btrim(coalesce(p.phone,''))   = '' then 'telefono'    end,
           case when btrim(coalesce(p.country,'')) = '' then 'pais'        end,
           case when not public.cuota_cubierta(p.id)    then 'cuota'       end
         ], null)
    from public.profiles p
    join public.directorio d on d.reclamada_por = p.id
    join auth.users u on u.id = p.id
   where p.is_published = false
     and p.suspended_at is null
     and u.email is not null
     and now() >= d.reclamada_en + interval '2 days'
     and not exists (
       select 1 from public.recordatorios_publicacion r
        where r.user_id = p.id
          and r.etapa = (case when now() >= d.reclamada_en + interval '15 days' then 15
                              when now() >= d.reclamada_en + interval '7 days'  then 7
                              else 2 end)
     );
$function$;

create or replace function public.recordatorio_publicacion_enviado(p_user uuid, p_etapa smallint)
 returns void
 language sql
 security definer
 set search_path to 'public'
as $function$
  insert into public.recordatorios_publicacion (user_id, etapa)
  values (p_user, p_etapa)
  on conflict (user_id, etapa) do nothing;
$function$;

revoke all on function public.cola_recordatorio_publicacion() from public, anon, authenticated;
revoke all on function public.recordatorio_publicacion_enviado(uuid, smallint) from public, anon, authenticated;
grant execute on function public.cola_recordatorio_publicacion() to service_role;
grant execute on function public.recordatorio_publicacion_enviado(uuid, smallint) to service_role;
