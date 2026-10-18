-- 0258: en las tandas 9 a 11 de Mexico, separar el carril de paga del exento, como
-- ya estaba en las tandas 1 a 4 (paga) y 5 a 8 (exenta). Una tanda mixta manda dos
-- cartas distintas a la vez y ensucia la medicion de cada una.

with mx as (
  select p.ficha_id, p.carril, p.score, d.nombre
  from public.directorio_plan_invitacion p
  join public.directorio d on d.id = p.ficha_id
  where p.tanda between 9 and 11 and d.pais = 'México'
),
renumerado as (
  select m.ficha_id,
    case when m.carril = 'E' then 11
         else 9 + (ntile(2) over (partition by m.carril order by m.score desc, m.nombre) - 1)
    end as tanda,
    row_number() over (partition by m.carril order by m.score desc, m.nombre) as orden
  from mx m
)
update public.directorio_plan_invitacion p
   set tanda = r.tanda,
       orden = r.orden
  from renumerado r
 where p.ficha_id = r.ficha_id;
