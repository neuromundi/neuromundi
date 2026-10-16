-- 0237 · Tope a las solicitudes de reserva. (Auditoría 15 oct 2026, hallazgo A-20.)
--
-- request_booking se puede llamar sin cuenta con la llave publica, y el numero
-- de miembro del prestador es publico. Cada llamada insertaba una solicitud Y
-- una notificacion, y la notificacion dispara correo y aviso al telefono: un
-- bucle inundaba la bandeja y el telefono de cualquier prestador. Las dos
-- funciones de borde hermanas (send-support, reclamar-ficha) si tienen control
-- de tasa; a esta se le olvido.
--
-- No hay direccion IP disponible dentro de SQL, asi que el tope es POR
-- PRESTADOR, que es donde esta el dano: su bandeja. Un prestador real no recibe
-- veinte solicitudes en una hora, y el aviso al administrador deja constancia.

create or replace function public.request_booking(
  p_provider_member_no bigint, p_name text, p_contact text,
  p_preferred text default null, p_note text default null
)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_provider uuid;
  v_role     text;
  v_id       uuid;
  v_recientes int;
begin
  if p_name is null or length(btrim(p_name)) = 0
     or p_contact is null or length(btrim(p_contact)) = 0 then
    return json_build_object('ok', false, 'error', 'invalid');
  end if;
  -- Tope de longitud: los tres campos van a parar a un correo.
  if length(p_name) > 120 or length(p_contact) > 160
     or length(coalesce(p_preferred,'')) > 200 or length(coalesce(p_note,'')) > 1000 then
    return json_build_object('ok', false, 'error', 'too_long');
  end if;

  select id, role into v_provider, v_role from public.profiles where member_no = p_provider_member_no;
  if v_provider is null or v_role is distinct from 'provider' then
    return json_build_object('ok', false, 'error', 'provider_not_found');
  end if;

  select count(*) into v_recientes
  from public.booking_requests
  where provider_id = v_provider and created_at > now() - interval '1 hour';

  if v_recientes >= 20 then
    perform public.notify_admins(
      'reservas_en_rafaga',
      'Muchas solicitudes de reserva a un mismo prestador',
      'Un prestador recibio mas de 20 solicitudes de reserva en una hora. Puede ser abuso del formulario publico.',
      jsonb_build_object('provider_id', v_provider, 'en_una_hora', v_recientes)
    );
    return json_build_object('ok', false, 'error', 'demasiadas_solicitudes');
  end if;

  insert into public.booking_requests (provider_id, name, contact, preferred, note)
  values (v_provider, btrim(p_name), btrim(p_contact),
          nullif(btrim(coalesce(p_preferred, '')), ''),
          nullif(btrim(coalesce(p_note, '')), ''))
  returning id into v_id;

  insert into public.notifications (user_id, type, title, body, data)
  values (v_provider, 'booking_request', 'Nueva solicitud de reserva',
    btrim(p_name) || ' quiere agendar contigo.',
    json_build_object('booking_id', v_id, 'name', btrim(p_name),
                      'contact', btrim(p_contact), 'preferred', p_preferred));

  return json_build_object('ok', true);
end;
$function$;
