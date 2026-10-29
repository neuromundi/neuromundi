-- ============================================================================
-- Los avisos de publicacion dejan de salir a las 9:00 de Ciudad de Mexico
-- para todo el mundo.
--
-- Antes la tarea programada disparaba una vez al dia a las 15:00 UTC. Eso son
-- las 9:00 en CDMX, pero las 12:00 en Brasil, las 16:00 en Madrid y las 7:00
-- en California. Un aviso que pide volver al panel y pulsar Publicar llega a
-- media tarde o antes de abrir, y nadie lo atiende.
--
-- Ahora la tarea se dispara CADA HORA y es la cola la que decide: devuelve a
-- una persona solo cuando en SU zona horaria son las 9 de la manana de un
-- martes, miercoles o jueves. La restriccion de dia deja de vivir en el cron
-- (que corre en UTC y no sabe en que dia esta el destinatario) y pasa aqui.
--
-- Los nombres IANA resuelven solos el horario de verano, que es justo lo que
-- nos hizo fallar el 25 de octubre con Espana: Europa lo termino ese dia y la
-- hora dicha dejo de corresponder con la hora real.
--
-- La tarea programada se ajusta aparte, a mano:
--   select cron.alter_job(120, schedule := '0 * * * *');
-- ============================================================================

create or replace function public.zona_horaria_del_perfil(p_pais text, p_estado text)
returns text
language sql
immutable
as $$
  select coalesce(
    -- Paises con mas de un huso: decide el estado.
    case p_pais
      when 'México' then case p_estado
          when 'Baja California'     then 'America/Tijuana'
          when 'Baja California Sur' then 'America/Mazatlan'
          when 'Sinaloa'             then 'America/Mazatlan'
          when 'Nayarit'             then 'America/Mazatlan'
          when 'Sonora'              then 'America/Hermosillo'
          when 'Chihuahua'           then 'America/Chihuahua'
          when 'Quintana Roo'        then 'America/Cancun'
          else 'America/Mexico_City' end
      when 'Estados Unidos' then case p_estado
          when 'California'          then 'America/Los_Angeles'
          when 'Nevada'              then 'America/Los_Angeles'
          when 'Oregón'              then 'America/Los_Angeles'
          when 'Washington'          then 'America/Los_Angeles'
          when 'Arizona'             then 'America/Phoenix'
          when 'Colorado'            then 'America/Denver'
          when 'Nuevo México'        then 'America/Denver'
          when 'Utah'                then 'America/Denver'
          when 'Montana'             then 'America/Denver'
          when 'Wyoming'             then 'America/Denver'
          when 'Idaho'               then 'America/Denver'
          when 'Texas'               then 'America/Chicago'
          when 'Illinois'            then 'America/Chicago'
          when 'Tennessee'           then 'America/Chicago'
          when 'Misuri'              then 'America/Chicago'
          when 'Luisiana'            then 'America/Chicago'
          when 'Minnesota'           then 'America/Chicago'
          when 'Wisconsin'           then 'America/Chicago'
          when 'Iowa'                then 'America/Chicago'
          when 'Arkansas'            then 'America/Chicago'
          when 'Oklahoma'            then 'America/Chicago'
          when 'Kansas'              then 'America/Chicago'
          when 'Nebraska'            then 'America/Chicago'
          when 'Alabama'             then 'America/Chicago'
          when 'Misisipi'            then 'America/Chicago'
          when 'Alaska'              then 'America/Anchorage'
          when 'Hawái'               then 'Pacific/Honolulu'
          else 'America/New_York' end
      when 'Canadá' then case p_estado
          when 'Columbia Británica'  then 'America/Vancouver'
          when 'Alberta'             then 'America/Edmonton'
          when 'Saskatchewan'        then 'America/Regina'
          when 'Manitoba'            then 'America/Winnipeg'
          when 'Nueva Escocia'       then 'America/Halifax'
          when 'Nuevo Brunswick'     then 'America/Halifax'
          when 'Isla del Príncipe Eduardo' then 'America/Halifax'
          when 'Terranova y Labrador' then 'America/St_Johns'
          else 'America/Toronto' end
      when 'Brasil' then case p_estado
          when 'AM' then 'America/Manaus'
          when 'RR' then 'America/Manaus'
          when 'RO' then 'America/Manaus'
          when 'AC' then 'America/Rio_Branco'
          when 'MT' then 'America/Cuiaba'
          when 'MS' then 'America/Campo_Grande'
          else 'America/Sao_Paulo' end
      when 'España' then case
          when p_estado in ('Canarias','Las Palmas','Santa Cruz de Tenerife') then 'Atlantic/Canary'
          else 'Europe/Madrid' end
      when 'Portugal' then case
          when p_estado in ('Açores','Azores','Madeira') then 'Atlantic/Azores'
          else 'Europe/Lisbon' end
      -- Un solo huso en todo el pais.
      when 'Argentina'            then 'America/Argentina/Buenos_Aires'
      when 'Chile'                then 'America/Santiago'
      when 'Colombia'             then 'America/Bogota'
      when 'Perú'                 then 'America/Lima'
      when 'Ecuador'              then 'America/Guayaquil'
      when 'Bolivia'              then 'America/La_Paz'
      when 'Paraguay'             then 'America/Asuncion'
      when 'Uruguay'              then 'America/Montevideo'
      when 'Venezuela'            then 'America/Caracas'
      when 'Puerto Rico'          then 'America/Puerto_Rico'
      when 'República Dominicana' then 'America/Santo_Domingo'
      when 'Panamá'               then 'America/Panama'
      when 'Costa Rica'           then 'America/Costa_Rica'
      when 'Guatemala'            then 'America/Guatemala'
      when 'El Salvador'          then 'America/El_Salvador'
      when 'Honduras'             then 'America/Tegucigalpa'
      when 'Nicaragua'            then 'America/Managua'
      else null
    end,
    -- Pais desconocido: NO se queda sin aviso. Sale a las 9:00 de CDMX, que es
    -- la hora de la casa, y queda a la vista en el reporte.
    'America/Mexico_City'
  );
$$;

comment on function public.zona_horaria_del_perfil(text, text) is
  'Nombre IANA de la zona horaria de un perfil, por pais y estado. Se usa para que los avisos lleguen a las 9:00 locales del destinatario. Un pais no contemplado cae en America/Mexico_City.';

create or replace function public.cola_recordatorio_publicacion()
returns table(user_id uuid, correo text, nombre text, pais text, etapa smallint, faltantes text[])
language sql
stable
security definer
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
     -- LA HORA DEL DESTINATARIO, no la nuestra: las 9 de la manana de un
     -- martes, miercoles o jueves donde vive quien va a leer el correo.
     -- La tarea programada se dispara cada hora y aqui se filtra; asi un
     -- aviso que caeria en sabado espera al martes siguiente sin perderse,
     -- porque la cola pregunta si YA pasaron los dias, no si se cumplen hoy.
     and extract(hour from (now() at time zone
           public.zona_horaria_del_perfil(p.country, p.state))) = 9
     and extract(isodow from (now() at time zone
           public.zona_horaria_del_perfil(p.country, p.state))) between 2 and 4
     and not exists (
       select 1 from public.recordatorios_publicacion r
        where r.user_id = p.id
          and r.etapa = (case when now() >= d.reclamada_en + interval '15 days' then 15
                              when now() >= d.reclamada_en + interval '7 days'  then 7
                              else 2 end)
     );
$function$;

comment on function public.cola_recordatorio_publicacion() is
  'Quien reclamo su ficha, no la ha publicado y le toca aviso AHORA MISMO: 9:00 locales de martes, miercoles o jueves, a los 2, 7 o 15 dias del reclamo. La tarea nm-recordar-publicacion la consulta cada hora.';
