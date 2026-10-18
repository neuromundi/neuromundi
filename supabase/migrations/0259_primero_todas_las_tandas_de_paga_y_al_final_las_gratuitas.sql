-- 0259: reordenar el plan para que NINGUNA tanda de perfiles gratuitos salga antes de
-- haber terminado TODAS las de perfiles de paga. Las tandas 1 a 4 (Mexico de paga, ya
-- revisadas) no se tocan. El resto se renumera: 5 a 19 de paga, 20 a 31 gratuitas.
-- Dentro de cada bloque se conserva el agrupamiento por huso horario.

with filas as (
  select p.ficha_id, p.carril, p.score, d.nombre, d.pais,
    case
      when d.pais = 'México'   then 'mx'
      when d.pais = 'España'   then 'es'
      when d.pais = 'Portugal' then 'pt'
      when d.pais = 'Brasil'   then 'br'
      when d.pais in ('Argentina','Uruguay','Chile','Paraguay')              then 'cono_sur'
      when d.pais in ('Colombia','Perú','Ecuador','Panamá')                  then 'andes'
      when d.pais in ('República Dominicana','Puerto Rico','Bolivia')        then 'caribe'
      when d.pais in ('El Salvador','Costa Rica','Honduras','Nicaragua','Guatemala') then 'centroamerica'
      when d.pais in ('Canadá','Estados Unidos')                             then 'norte'
    end as grupo
  from public.directorio_plan_invitacion p
  join public.directorio d on d.id = p.ficha_id
  where p.tanda >= 5
),
seg as (
  select f.*,
    case
      when f.carril = 'E' and f.grupo in ('cono_sur','andes','norte') then 'resto_E'
      else f.grupo || '_' || f.carril
    end as segmento
  from filas f
),
cfg(segmento, tanda_ini, n_tandas, hora) as (values
  -- bloque de paga
  ('mx_P',             5, 2, '9:30 CDMX'),
  ('es_P',             7, 5, '9:30 Madrid = 2:30 CDMX'),
  ('pt_P',            12, 1, '9:30 Lisboa = 3:30 CDMX'),
  ('br_P',            13, 2, '9:30 Sao Paulo = 6:30 CDMX'),
  ('cono_sur_P',      15, 1, '9:30 Buenos Aires = 6:30 CDMX'),
  ('andes_P',         16, 1, '9:30 Bogota = 8:30 CDMX'),
  ('caribe_P',        17, 1, '9:30 Santo Domingo = 7:30 CDMX'),
  ('centroamerica_P', 18, 1, '9:30 San Salvador = 9:30 CDMX'),
  ('norte_P',         19, 1, '9:30 Toronto = 8:30 CDMX'),
  -- bloque gratuito, arranca solo cuando el de paga termino
  ('mx_E',            20, 5, '9:30 CDMX'),
  ('es_E',            25, 4, '9:30 Madrid = 2:30 CDMX'),
  ('pt_E',            29, 2, '9:30 Lisboa = 3:30 CDMX'),
  ('resto_E',         31, 1, '9:30 local de cada pais, se dispara a las 8:30 CDMX')
),
asignado as (
  select s.ficha_id, s.carril, s.segmento, c.hora,
    c.tanda_ini + (ntile(c.n_tandas) over (partition by s.segmento
                                           order by s.score desc, s.nombre) - 1) as tanda,
    row_number() over (partition by s.segmento order by s.score desc, s.nombre) as orden
  from seg s
  join cfg c on c.segmento = s.segmento
)
update public.directorio_plan_invitacion p
   set tanda  = a.tanda,
       orden  = a.orden,
       motivo = (case a.carril when 'P' then 'paga cuota' else 'exenta de cuota' end)
                || '; bloque ' || a.segmento
                || '; se envia a las ' || a.hora
                || '; las gratuitas no salen hasta terminar todas las de paga'
  from asignado a
 where p.ficha_id = a.ficha_id;
