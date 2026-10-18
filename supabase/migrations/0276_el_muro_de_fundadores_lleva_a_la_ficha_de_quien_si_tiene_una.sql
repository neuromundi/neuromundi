-- 0276: el muro de fundadores devuelve a quién se puede visitar.
--
-- Al tocar un fundador en el muro no pasaba nada. La causa no era la interfaz:
-- `founders_wall` nunca devolvió el identificador del perfil, así que el
-- navegador no tenía a dónde llevar a nadie.
--
-- Tiene sentido que lleve a su ficha —para eso se entra al muro, para ver qué
-- ofrece esa persona o ese comercio—, pero NO para todos, por dos razones
-- distintas:
--
--   · Una familia fundadora no tiene servicios ni productos que consultar. Su
--     perfil es el de una persona particular, y enlazarlo desde un muro público
--     no sería un enlace roto: sería exponer a alguien que entró al muro por su
--     nombre y su folio, no para que lo visiten. Por eso `families` queda fuera
--     por definición, no por configuración.
--   · Un profesional o comercio cuya ficha no está publicada, o cuya membresía
--     no está vigente, no aparece en el directorio. Enlazarlo sería mandar a la
--     gente a una página que no existe.
--
-- Medido el 18 de octubre de 2026: hay 3 fundadores en el muro y sólo 1 cumple
-- ambas condiciones. Enlazando a todos, dos de cada tres clics irían a ninguna
-- parte o a donde no deben.
--
-- `provider_id` viene SÓLO cuando se puede visitar, y null en cualquier otro
-- caso. La interfaz enlaza si viene y no enlaza si no viene: nunca hay un clic
-- muerto, y la regla vive en un solo sitio en vez de repetirse en la pantalla.
-- Se reutiliza `perfil_publicado_y_vigente` (0273), que responde eso sin
-- exponer una sola columna de `profiles`.
--
-- Va como función NUEVA en lugar de reemplazar la anterior porque cambiar el
-- tipo de retorno obliga a borrar primero, y `drop function` no llega a
-- ejecutarse por la vía con la que se aplican estas migraciones. La vieja
-- queda sin uso y se retira en una limpieza posterior.
--
-- Comprobado como visitante anónimo: devuelve exactamente las mismas filas que
-- la anterior, más la columna nueva.

create or replace function public.founders_wall_v2(p_country text default null::text)
returns table(
  display_name text,
  member_no bigint,
  kind text,
  country text,
  featured boolean,
  is_company boolean,
  provider_id uuid
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    coalesce(nullif(p.business_name, ''), nullif(p.full_name, ''), 'Neuromundi'),
    p.member_no,
    f.kind,
    f.country,
    f.wall_featured,
    coalesce(p.is_company, false),
    case
      when f.kind <> 'families' and public.perfil_publicado_y_vigente(p.id)
        then p.id
      else null::uuid
    end
  from public.founder_members f
  join public.profiles p on p.id = f.user_id
  where f.wall_published = true
    and coalesce(p.is_internal, false) = false
    and (p_country is null or f.country = p_country)
  order by f.wall_featured desc, f.wall_order asc, p.member_no asc nulls last;
$function$;

comment on function public.founders_wall_v2(text) is
  'Muro publico de fundadores. provider_id solo viene cuando esa ficha se puede visitar en el directorio; para familias es siempre null.';

grant execute on function public.founders_wall_v2(text) to anon, authenticated;
