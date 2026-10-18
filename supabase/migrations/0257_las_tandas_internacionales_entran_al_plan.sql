-- 0257: las fichas de fuera del plan entran a las tandas 9 a 30, agrupadas por huso
-- horario para que cada tanda se pueda disparar a las 9:30 de la mañana local.
-- Quedan fuera: las de dominio inexistente (ya marcadas como rebotadas) y las seis
-- cuyo dominio no declara servidor de correo, que esperan comprobacion a mano.

with base as (
  select d.id, d.nombre, d.correo, d.sitio_web, d.telefono, d.ciudad, d.pais,
    case when coalesce(d.sector,'') in ('publico','social')
           or d.provider_type in ('ngo','company') then 'E' else 'P' end as carril,
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
  from public.directorio d
  where d.correo is not null and d.correo <> ''
    and d.correo_rebotado = false
    and d.reclamada_por is null
    and d.baja_solicitada = false
    and coalesce(d.notas,'') not like '%no declara servidor de correo%'
    and not exists (select 1 from public.directorio_plan_invitacion p where p.ficha_id = d.id)
),
puntuado as (
  select b.*,
      case
        when lower(split_part(b.correo,'@',2)) in (
          'gmail.com','hotmail.com','hotmail.es','hotmail.com.br','yahoo.es','yahoo.com',
          'yahoo.com.br','yahoo.com.mx','outlook.com','outlook.es','msn.com','live.com.mx',
          'icloud.com','me.com','terra.com.br','uol.com.br','sapo.pt','net.sapo.pt',
          'telefonica.net','ono.com','wanadoo.es','euskalnet.net','netcabo.pt','netvisao.pt',
          'superig.com.br','futurnet.es','prodigy.net.mx','irakasle.net')
        then 0
        when lower(split_part(b.correo,'@',2)) in
          ('cop.es','correo.cop.es','copc.cat','comb.cat','comv.es','mesvilaweb.cat')
        then 2
        else 4
      end
    + case when b.sitio_web is not null then 2 else 0 end
    + case when b.telefono  is not null then 1 else 0 end
    + case when b.ciudad    is not null then 1 else 0 end as score
  from base b
),
seg as (
  select p.*,
    case
      when grupo = 'es' and carril = 'P' then 'es_p'
      when grupo = 'es'                  then 'es_e'
      when grupo = 'pt' and carril = 'P' then 'pt_p'
      when grupo = 'pt'                  then 'pt_e'
      else grupo
    end as segmento
  from puntuado p
),
cfg(segmento, tanda_ini, n_tandas, hora) as (values
  ('mx',            9, 3, '9:30 CDMX'),
  ('es_p',         12, 5, '9:30 Madrid = 2:30 CDMX'),
  ('es_e',         17, 4, '9:30 Madrid = 2:30 CDMX'),
  ('pt_p',         21, 1, '9:30 Lisboa = 3:30 CDMX'),
  ('pt_e',         22, 2, '9:30 Lisboa = 3:30 CDMX'),
  ('br',           24, 2, '9:30 Sao Paulo = 6:30 CDMX'),
  ('cono_sur',     26, 1, '9:30 Buenos Aires = 6:30 CDMX'),
  ('andes',        27, 1, '9:30 Bogota = 8:30 CDMX'),
  ('caribe',       28, 1, '9:30 Santo Domingo = 7:30 CDMX'),
  ('centroamerica',29, 1, '9:30 San Salvador = 9:30 CDMX'),
  ('norte',        30, 1, '9:30 Toronto = 8:30 CDMX')
),
asignado as (
  select s.id, s.carril, s.score, s.segmento, c.hora,
    c.tanda_ini + (ntile(c.n_tandas) over (partition by s.segmento
                                           order by s.score desc, s.nombre) - 1) as tanda,
    row_number() over (partition by s.segmento order by s.score desc, s.nombre) as orden
  from seg s
  join cfg c on c.segmento = s.segmento
)
insert into public.directorio_plan_invitacion (ficha_id, tanda, orden, score, motivo, carril)
select a.id, a.tanda, a.orden, a.score,
  (case a.carril when 'P' then 'paga cuota' else 'exenta de cuota' end)
  || '; bloque ' || a.segmento
  || '; se envia a las ' || a.hora
  || '; orden por dominio propio, sitio web, telefono y ciudad',
  a.carril
from asignado a;
