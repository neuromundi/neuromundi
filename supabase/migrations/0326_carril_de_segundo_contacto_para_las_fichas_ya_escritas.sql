-- SEGUNDO CONTACTO A QUIEN YA RECIBIO LA INVITACION (21 oct 2026).
--
-- Las 83 fichas de paga que ya recibieron el correo lo recibieron SIN el plazo
-- gratuito de 30 dias, porque no existia. No hay nada que corregir —su correo
-- nunca prometio un plazo de pago— pero si hay una oferta mejor que no
-- conocen, y eso es motivo legitimo para escribir una segunda vez.
--
-- La cola normal (directorio_invitaciones_cola_tanda_v3) exige
-- `enviada_en is null`: es lo que hace que un reenvio de la misma tanda no
-- duplique correos, y no se toca. El segundo contacto necesita exactamente lo
-- contrario, asi que lleva su propio carril, con su propia marca.
--
-- La marca es por MOTIVO, no un simple "ya se reenvio": el dia que haya un
-- tercer contacto por otra razon, este no debe bloquearlo.
alter table public.directorio_invitaciones
  add column if not exists reenvio_en timestamptz,
  add column if not exists reenvio_motivo text;

create or replace function public.directorio_invitaciones_cola_reenvio(
  p_motivo text,
  p_limit  integer default 25
)
returns table(token text, correo text, nombre text, provider_type text, sector text,
              estado text, ciudad text, pais text, ya_contactado_8sep boolean,
              correo_personal boolean, orden integer, affiliate_type text, moneda text,
              precio_fundador numeric, precio_ordinario numeric, precio_configurado boolean,
              precio_desde boolean)
language sql
stable
security definer
set search_path to 'public'
as $$
  with q as (
    select i.token, i.correo, d.nombre, d.provider_type,
           coalesce(d.sector,'privado') as sector, d.estado, d.ciudad,
           coalesce(d.pais,'México') as pais,
           exists (select 1 from public.contactados_campana_20260908 c
                   where lower(c.correo) = lower(i.correo)) as ya_contactado_8sep,
           (i.correo ~* '@(gmail|hotmail|outlook|yahoo|live|icloud|me|aol|msn|gmx|prodigy)\.') as correo_personal,
           pl.orden,
           public.ficha_affiliate_type(d.provider_type, d.profession) as affiliate_type,
           (d.provider_type = 'service_provider'
            and public.is_medical_profession(d.profession) is null) as sin_profesion,
           row_number() over (partition by lower(btrim(i.correo)) order by pl.orden) as n
    from public.directorio_invitaciones i
    join public.directorio d on d.id = i.directorio_id
    join public.directorio_plan_invitacion pl on pl.ficha_id = i.directorio_id
    where i.enviada_en is not null
      -- Ya reclamo: no se le vuelve a invitar.
      and i.usada_en is null
      -- Cancelada cubre la queja de spam (migracion 0319): a quien nos marco
      -- como spam no se le escribe otra vez, y es la razon por la que esta
      -- condicion no se puede relajar.
      and i.cancelada_en is null
      and i.baja_en is null
      and i.expira_en > now()
      and not coalesce(d.correo_rebotado, false)
      and d.reclamada_por is null
      and d.estado_revision = 'publicado' and not d.baja_solicitada
      -- Solo el carril de paga: a los exentos este correo no les dice nada,
      -- porque nunca tuvieron cuota que diferir.
      and pl.carril = 'P'
      and coalesce(d.sector,'privado') = 'privado'
      -- Idempotencia por motivo.
      and (i.reenvio_en is null or coalesce(i.reenvio_motivo, '') <> p_motivo)
      and not exists (
        select 1 from public.directorio d2
        where lower(btrim(d2.correo)) = lower(btrim(i.correo))
          and d2.baja_solicitada
      )
  )
  select q.token, q.correo, q.nombre, q.provider_type, q.sector, q.estado, q.ciudad, q.pais,
         q.ya_contactado_8sep, q.correo_personal, q.orden, q.affiliate_type,
         coalesce(cot ->> 'currency', 'MXN'),
         (cot ->> 'founder_annual')::numeric,
         (cot ->> 'ordinary_annual')::numeric,
         coalesce((cot ->> 'configured')::boolean, false),
         coalesce((cot ->> 'is_from')::boolean, false)
  from q, lateral public.registration_quote(
         case when q.sin_profesion then 'specialist' else q.affiliate_type end,
         q.pais) as cot
  where q.n = 1
  order by q.orden
  limit greatest(1, least(coalesce(p_limit, 25), 200));
$$;

revoke all on function public.directorio_invitaciones_cola_reenvio(text, integer) from public;
grant execute on function public.directorio_invitaciones_cola_reenvio(text, integer) to service_role;

-- Marca el segundo contacto. NO toca enviada_en: esa fecha es la del primer
-- correo y es la que sostiene los plazos sellados y el informe de entrega.
create or replace function public.directorio_invitacion_reenviada(
  p_token  text,
  p_motivo text
) returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.directorio_invitaciones
     set reenvio_en = now(), reenvio_motivo = p_motivo
   where token = p_token;
  return found;
end $$;

revoke all on function public.directorio_invitacion_reenviada(text, text) from public;
grant execute on function public.directorio_invitacion_reenviada(text, text) to service_role;
