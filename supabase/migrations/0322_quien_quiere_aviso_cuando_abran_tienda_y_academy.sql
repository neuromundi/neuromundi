-- La Tienda y Academy estan vacias (medido el 21 oct 2026: 0 productos,
-- 0 cursos). Su estado vacio deja de decir "proximamente" y pasa a decir que
-- estamos reuniendo los primeros, con un boton para pedir aviso.
--
-- Ese boton NO reutiliza catalog_suggestions: esa tabla tiene un unico
-- (kind, lower(name)) con "on conflict do nothing", asi que todos los avisos
-- de una seccion colapsarian en una sola fila y no habria con que contar la
-- demanda. Aqui cada correo es una fila, y la unicidad es por (seccion,correo)
-- para que pedirlo dos veces no duplique.
--
-- Es, ademas, la primera senal MEDIDA de demanda por pais que tendra la
-- plataforma: hoy no existe ninguna.
create table if not exists public.avisos_de_seccion (
  id          uuid primary key default gen_random_uuid(),
  seccion     text not null check (seccion in ('tienda', 'academy')),
  correo      text not null check (position('@' in correo) > 1),
  pais        text,
  user_id     uuid references public.profiles(id) on delete set null,
  creada_en   timestamptz not null default now(),
  avisado_en  timestamptz
);

create unique index if not exists avisos_de_seccion_unicos
  on public.avisos_de_seccion (seccion, correo);
create index if not exists avisos_de_seccion_por_pais
  on public.avisos_de_seccion (seccion, pais);

alter table public.avisos_de_seccion enable row level security;

-- Es una lista de correos: nadie la lee desde el cliente salvo el admin. Las
-- altas entran por la funcion de abajo (security definer), no por insert
-- directo, para que el correo quede normalizado y nadie pueda sembrar filas
-- con datos de otra persona.
do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'avisos_de_seccion'
       and policyname = 'avisos_de_seccion_admin_lee'
  ) then
    create policy avisos_de_seccion_admin_lee on public.avisos_de_seccion
      for select using (public.is_admin());
  end if;
end $$;

-- Regla 0 del proyecto: GRANT explicito en la misma migracion que crea la
-- tabla. anon y authenticated NO reciben insert: escriben por la RPC.
grant select on public.avisos_de_seccion to authenticated;
grant select, insert, update, delete on public.avisos_de_seccion to service_role;

create or replace function public.pedir_aviso_de_seccion(
  p_seccion text,
  p_correo  text,
  p_pais    text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_correo text := lower(nullif(btrim(coalesce(p_correo, '')), ''));
begin
  if p_seccion not in ('tienda', 'academy') then
    return jsonb_build_object('ok', false, 'motivo', 'seccion invalida');
  end if;
  -- Validacion deliberadamente laxa: basta que parezca un correo. Rechazar
  -- direcciones validas por una expresion demasiado estricta cuesta mas que
  -- aceptar una invalida, que simplemente rebotara cuando se le escriba.
  if v_correo is null or position('@' in v_correo) < 2 or position('.' in split_part(v_correo, '@', 2)) < 2 then
    return jsonb_build_object('ok', false, 'motivo', 'correo invalido');
  end if;

  insert into public.avisos_de_seccion (seccion, correo, pais, user_id)
  values (p_seccion, left(v_correo, 254), nullif(btrim(coalesce(p_pais, '')), ''), auth.uid())
  on conflict (seccion, correo) do nothing;

  -- Se responde ok tanto si entro como si ya estaba: para quien lo pide el
  -- resultado es el mismo, y decir "ya estabas en la lista" filtraria si un
  -- correo ajeno esta registrado o no.
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.pedir_aviso_de_seccion(text, text, text) from public;
grant execute on function public.pedir_aviso_de_seccion(text, text, text) to anon, authenticated;

-- Para el panel: cuanta demanda hay por seccion y pais.
create or replace function public.admin_avisos_de_seccion()
returns table (seccion text, pais text, total bigint)
language sql
stable
security definer
set search_path to 'public'
as $$
  select a.seccion, coalesce(a.pais, 'sin pais') as pais, count(*) as total
    from public.avisos_de_seccion a
   where public.is_admin()
   group by a.seccion, coalesce(a.pais, 'sin pais')
   order by 3 desc, 1, 2;
$$;

revoke all on function public.admin_avisos_de_seccion() from public;
grant execute on function public.admin_avisos_de_seccion() to authenticated;
