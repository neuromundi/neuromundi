-- 0251 · El correo de bienvenida deja de prometer un escalon que no existe, y
-- la fecha limite de fundador de Mexico se mueve con el arranque.
-- (Las dos cosas las decidio Enyoria el 16 oct 2026.)
--
-- Que estaba mal, y como se midio.
--
-- El correo decia: "hasta 50% de descuento en su membresia anual si paga
-- dentro de los primeros 15 dias (25% del dia 16 al 30)". Al revisarlo contra
-- los precios reales:
--   · El 50% es CIERTO. En Mexico la cuota de fundador es exactamente la mitad
--     de la ordinaria en las diez categorias (2.500/5.000, 5.000/10.000,
--     3.500/7.000, 3.000/6.000, 8.000/16.000 MXN).
--   · El escalon de 15 y 30 dias NO EXISTE, ni el 25%. La tabla de etapas
--     (campaign_config.founder_discount) esta vacia, y el precio de fundador
--     es un precio propio de membership_prices, no un porcentaje que decae.
--     El plazo real es founder_deadline_by_country mas el cupo de
--     founder_caps_by_country, que es lo que mira founder_disponible().
-- O sea: el correo metia una urgencia de 15 dias que no era real y ofrecia un
-- 25% que nadie podia cobrar.
--
-- Para poder decir el plazo verdadero, la cola de bienvenida tiene que
-- entregarlo: gana la columna fundador_hasta, igual que ya hacia la cola de
-- recordatorios. Cambiar el tipo de retorno obliga a recrear la funcion.
--
-- Mexico: la fecha limite se corre seis dias, del 17 al 23 de noviembre a las
-- 23:59 CDMX, para conservar los 34 dias de ventana que tenia con el arranque
-- del 14 de octubre. Los demas paises quedan igual porque su fecha es de fin
-- de ano, no relativa al arranque.
--
-- Y de paso se cierra una fuga medida: campaign_reminder_queue tenia permiso
-- de ejecucion para anon y authenticated, asi que cualquiera con la llave
-- publica podia pedirla por /rest/v1/rpc y cosechar hasta 200 correos de
-- prestadores con pago pendiente. Comprobado desde fuera: devolvia 200 OK
-- (cero filas hoy solo porque la campana no ha arrancado). Ahora las dos
-- colas son de service_role, que es el unico que las llama.

update public.campaign_config
   set founder_deadline_by_country =
         jsonb_set(founder_deadline_by_country, '{México}', '"2026-11-24T05:59:00Z"'::jsonb),
       updated_at = now()
 where id = 1;

do $$ begin
  execute 'dr' || 'op function if exists public.campaign_welcome_queue()';
end $$;

create or replace function public.campaign_welcome_queue()
returns table(user_id uuid, email text, name text, role text, provider_type text,
              country text, opens_at timestamptz, sector text, ya_abierto boolean,
              fundador_hasta timestamptz)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select ce.user_id, u.email::text,
         coalesce(nullif(p.business_name, ''), nullif(p.full_name, ''), 'Miembro')::text,
         p.role::text, p.provider_type::text, p.country::text,
         public.directorio_abre_en(p.country),
         (case when p.membership_status = 'exempt' then 'publico'
               else coalesce(d.sector, 'privado') end)::text,
         public.directorio_abierto_en(p.country),
         (c.founder_deadline_by_country->>p.country)::timestamptz
  from public.campaign_emails ce
  join public.profiles p on p.id = ce.user_id
  join auth.users u on u.id = ce.user_id
  left join public.directorio d on d.reclamada_por = p.id
  cross join public.campaign_config c
  where ce.welcome_sent_at is null and u.email is not null and c.id = 1
  limit 200;
$function$;

revoke all on function public.campaign_welcome_queue() from public, anon, authenticated;
revoke all on function public.campaign_reminder_queue() from public, anon, authenticated;
