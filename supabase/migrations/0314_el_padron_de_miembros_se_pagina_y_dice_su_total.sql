-- 0314 — El padrón de miembros se pagina y DICE cuántos hay en total.
--
-- Por qué (repaso adversario, 20 de octubre de 2026):
-- `admin_members` corta en `least(p_limit, 1000)`, así que nunca devuelve más
-- de 1,000 filas aunque se le pidan más, y no hay forma de pedir la página
-- siguiente. El panel pedía 300 sin decirlo en ninguna parte y su botón de
-- descarga exportaba justo esas filas con nombre de respaldo completo. Medido
-- hoy: hay 6 cuentas, así que el tope todavía no recorta nada; con 1,121
-- invitaciones por enviar empezará a recortar durante la campaña.
--
-- Qué hace esta migración:
--  · Crea `admin_members_pagina`, con los mismos filtros y las mismas columnas
--    más dos: `total` (cuántas filas cumplen el filtro, sin el recorte) y
--    `offset_aplicado`. Con el total, la pantalla ya no tiene que adivinar si
--    lo que ve es todo.
--  · Acepta `p_offset` para pedir la página siguiente, y permite hasta 5,000
--    filas por página para que una descarga completa no necesite 31 viajes.
--
-- Por qué una función NUEVA y no se cambia la que había: añadir un parámetro a
-- una función de plpgsql no la reemplaza, crea una segunda con otra firma, y
-- entonces las llamadas quedan ambiguas. Borrar la vieja aquí tampoco: el
-- borrado de funciones por esta vía se queda colgado. `admin_members` queda
-- en su sitio, sin uso desde la aplicación, y se retira en una migración
-- aparte hecha con la herramienta de línea de comandos.

create or replace function public.admin_members_pagina(
  p_estado     text    default null,
  p_q          text    default null,
  p_limit      integer default 300,
  p_offset     integer default 0,
  p_pais       text    default null,
  p_seccion    text    default null,
  p_fundador   boolean default null,
  p_tipo       text    default null,
  p_publicado  boolean default null,
  p_reclamado  boolean default null,
  p_pagado     boolean default null
)
returns table(
  id uuid, member_no bigint, full_name text, business_name text, email text,
  role text, provider_type text, affiliate_type text, country text,
  membership_status text, membership_period text,
  membership_paid_until timestamptz, membership_due_at timestamptz,
  suspended_at timestamptz, suspend_until timestamptz,
  is_published boolean, es_fundador boolean, ficha_id uuid,
  ficha_verificada boolean, sections text[], ha_pagado boolean,
  created_at timestamptz,
  total bigint, offset_aplicado integer
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_q      text    := nullif(btrim(coalesce(p_q, '')), '');
  v_limit  integer := greatest(1, least(coalesce(p_limit, 300), 5000));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
begin
  if not public.is_admin() then
    raise exception 'solo administradores';
  end if;

  return query
  with filtradas as (
    select p.id, p.member_no, p.full_name, p.business_name, u.email::text as email,
           p.role, p.provider_type, public.affiliate_type_for(p.id) as affiliate_type,
           p.country, p.membership_status, p.membership_period,
           p.membership_paid_until, p.membership_due_at,
           p.suspended_at, p.suspend_until, p.is_published,
           exists (select 1 from public.founder_members f where f.user_id = p.id) as es_fundador,
           d.id as ficha_id,
           (d.id is not null and (d.reclamada_por is not null or coalesce(d.verificada_manual, false))) as ficha_verificada,
           coalesce(p.sections, '{}'::text[]) as sections,
           (p.stripe_subscription_id is not null or p.membership_paid_until is not null) as ha_pagado,
           p.created_at
    from public.profiles p
    left join auth.users u on u.id = p.id
    left join public.directorio d on d.reclamada_por = p.id
    where (
        p_estado is null or p_estado = 'todos'
        or (p_estado = 'suspendido' and p.suspended_at is not null)
        or (p_estado = 'activo'     and p.membership_status = 'active'  and p.suspended_at is null)
        or (p_estado = 'pendiente'  and p.membership_status = 'pending' and p.suspended_at is null)
        or (p_estado = 'exento'     and p.membership_status = 'exempt')
        or (p_estado = 'vencido'    and (p.membership_status = 'past_due'
              or (p.membership_paid_until is not null and p.membership_paid_until < now())))
      )
      and (v_q is null
        or p.full_name     ilike '%' || v_q || '%'
        or p.business_name ilike '%' || v_q || '%'
        or u.email::text   ilike '%' || v_q || '%'
        or p.member_no::text = v_q)
      and (p_pais is null or p.country = p_pais)
      and (p_seccion is null or p_seccion = any(coalesce(p.sections, '{}'::text[])))
      and (p_fundador is null
        or p_fundador = exists (select 1 from public.founder_members f where f.user_id = p.id))
      and (p_tipo is null or p.provider_type = p_tipo)
      and (p_publicado is null or p_publicado = p.is_published)
      and (p_reclamado is null or p_reclamado = (d.id is not null))
      and (p_pagado is null or p_pagado =
            (p.stripe_subscription_id is not null or p.membership_paid_until is not null))
  )
  select f.*, count(*) over () as total, v_offset as offset_aplicado
  from filtradas f
  order by f.created_at desc
  limit v_limit offset v_offset;
end
$function$;

comment on function public.admin_members_pagina is
  'Padron de miembros con filtros, paginado, y el TOTAL de filas que cumplen el filtro. Sustituye a admin_members, que cortaba en 1,000 sin decirlo.';

revoke all on function public.admin_members_pagina(text, text, integer, integer, text, text, boolean, text, boolean, boolean, boolean) from public, anon;
grant execute on function public.admin_members_pagina(text, text, integer, integer, text, text, boolean, text, boolean, boolean, boolean) to authenticated;
