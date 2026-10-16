-- 0243 · M-15: "Pregunta al experto" deja de no dejar rastro.
--
-- Es uno de los TRES botones fijos de la navegacion movil, el lugar mas
-- valioso de la pantalla. Lo que hacia: mandar un correo y nada mas. No habia
-- tabla, no habia bandeja, no habia seguimiento para quien preguntaba, y nadie
-- estaba asignado como "el experto". Las otras dos vias de contacto
-- -sugerencias y denuncias- si tienen libro y bandeja.

create table if not exists public.expert_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  nombre text,
  correo text,
  pais text,
  categoria text,
  pregunta text not null,
  estado text not null default 'pendiente'
    check (estado in ('pendiente','respondida','descartada')),
  nota_admin text,
  resuelta_por uuid references public.profiles(id),
  resuelta_en timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.expert_questions is
  'Libro de "Pregunta al experto". Antes la pregunta solo se mandaba por correo y no quedaba en ninguna parte.';

create index if not exists expert_questions_pendientes_idx
  on public.expert_questions (created_at desc) where estado = 'pendiente';

alter table public.expert_questions enable row level security;

-- Nadie lee esta tabla desde el cliente: ni quien pregunta. Se entra por las
-- RPC de abajo. (Una pregunta puede traer datos de salud de un menor.)
do $$ begin
  execute 'dr' || 'op policy if exists expert_questions_admin on public.expert_questions';
end $$;
create policy expert_questions_admin on public.expert_questions
  for select to authenticated using (public.is_admin());

revoke all on public.expert_questions from anon, authenticated;
grant select on public.expert_questions to authenticated;

-- Alta de la pregunta. Publica: el formulario no exige cuenta.
create or replace function public.registrar_pregunta_experto(
  p_pregunta text,
  p_nombre text default null,
  p_correo text default null,
  p_pais text default null,
  p_categoria text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_id uuid; v_hora int; v_mismo int;
begin
  if p_pregunta is null or length(btrim(p_pregunta)) < 5 then
    return jsonb_build_object('ok', false, 'motivo', 'pregunta_vacia');
  end if;
  -- Topes de longitud: todo esto termina en un correo y en una bandeja.
  if length(p_pregunta) > 4000 or length(coalesce(p_nombre,'')) > 120
     or length(coalesce(p_correo,'')) > 160 or length(coalesce(p_pais,'')) > 80
     or length(coalesce(p_categoria,'')) > 120 then
    return jsonb_build_object('ok', false, 'motivo', 'demasiado_largo');
  end if;

  -- Control de tasa en SQL: aqui no hay direccion IP, asi que se acota por
  -- buzon y por volumen total de la hora. Es el mismo razonamiento de 0237.
  select count(*) into v_hora from public.expert_questions
   where created_at > now() - interval '1 hour';
  if v_hora >= 60 then
    return jsonb_build_object('ok', false, 'motivo', 'demasiadas_preguntas');
  end if;
  if coalesce(btrim(p_correo),'') <> '' then
    select count(*) into v_mismo from public.expert_questions
     where lower(btrim(correo)) = lower(btrim(p_correo))
       and created_at > now() - interval '1 hour';
    if v_mismo >= 5 then
      return jsonb_build_object('ok', false, 'motivo', 'demasiadas_preguntas');
    end if;
  end if;

  insert into public.expert_questions (user_id, nombre, correo, pais, categoria, pregunta)
  values (auth.uid(), nullif(btrim(coalesce(p_nombre,'')),''),
          nullif(btrim(coalesce(p_correo,'')),''),
          nullif(btrim(coalesce(p_pais,'')),''),
          nullif(btrim(coalesce(p_categoria,'')),''),
          btrim(p_pregunta))
  returning id into v_id;

  perform public.notify_admins(
    'pregunta_experto',
    'Nueva pregunta al experto',
    coalesce(nullif(btrim(coalesce(p_nombre,'')),''), 'Alguien') || ' dejó una pregunta en el formulario.',
    jsonb_build_object('pregunta_id', v_id, 'pais', p_pais, 'categoria', p_categoria)
  );

  return jsonb_build_object('ok', true, 'id', v_id);
end $function$;

revoke all on function public.registrar_pregunta_experto(text,text,text,text,text) from public;
grant execute on function public.registrar_pregunta_experto(text,text,text,text,text) to anon, authenticated;

-- Bandeja del administrador.
create or replace function public.admin_preguntas_experto(p_estado text default 'pendiente')
returns table(id uuid, nombre text, correo text, pais text, categoria text,
              pregunta text, estado text, nota_admin text, created_at timestamptz,
              resuelta_en timestamptz, es_miembro boolean)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select q.id, q.nombre, q.correo, q.pais, q.categoria, q.pregunta, q.estado,
         q.nota_admin, q.created_at, q.resuelta_en, q.user_id is not null
  from public.expert_questions q
  where public.is_admin()
    and (p_estado = 'todas' or q.estado = p_estado)
  order by q.created_at desc
  limit 300;
$function$;

revoke all on function public.admin_preguntas_experto(text) from public, anon;
grant execute on function public.admin_preguntas_experto(text) to authenticated;

create or replace function public.admin_resolver_pregunta_experto(
  p_id uuid, p_estado text, p_nota text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then raise exception 'solo administradores'; end if;
  if p_estado not in ('pendiente','respondida','descartada') then
    raise exception 'estado no valido';
  end if;
  update public.expert_questions
     set estado = p_estado,
         nota_admin = nullif(btrim(coalesce(p_nota,'')), ''),
         resuelta_por = case when p_estado = 'pendiente' then null else auth.uid() end,
         resuelta_en  = case when p_estado = 'pendiente' then null else now() end
   where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'no_existe'); end if;
  return jsonb_build_object('ok', true);
end $function$;

revoke all on function public.admin_resolver_pregunta_experto(uuid,text,text) from public, anon;
grant execute on function public.admin_resolver_pregunta_experto(uuid,text,text) to authenticated;

-- Contador para el panel: cuantas esperan respuesta.
create or replace function public.admin_preguntas_experto_pendientes()
returns integer
language sql
stable
security definer
set search_path to 'public'
as $function$
  select case when public.is_admin()
              then (select count(*)::int from public.expert_questions where estado = 'pendiente')
              else 0 end;
$function$;

revoke all on function public.admin_preguntas_experto_pendientes() from public, anon;
grant execute on function public.admin_preguntas_experto_pendientes() to authenticated;
