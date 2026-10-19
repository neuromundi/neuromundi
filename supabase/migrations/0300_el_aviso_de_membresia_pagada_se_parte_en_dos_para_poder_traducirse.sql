-- El aviso al miembro y el aviso al administrador compartian el tipo
-- 'membership_paid', y la pantalla traduce POR TIPO: con dos mensajes
-- distintos bajo una sola clave no se podia traducir ninguno y los dos
-- quedaban en el espanol guardado en la fila. El aviso al administrador pasa
-- a tener tipo propio, y uno por periodo para no depender de interpolar una
-- palabra que tambien habria que traducir.
create or replace function public.notif_category(p_type text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select case
    when p_type like 'appt_%' or p_type in ('booking_request', 'waitlist_slot', 'reservas_en_rafaga') then 'citas'
    when p_type like 'contacto_%' or p_type in ('direct_message', 'admin_message', 'account_costo', 'pregunta_experto') then 'mensajes'
    when p_type like 'evento_%' or p_type like 'aliado_%' or p_type in (
                    'post_achievement', 'badge', 'waitlist_join', 'referral_use', 'referral_reward',
                    'directory_match', 'suspension_reminder', 'topic_job', 'topic_venue',
                    'forum_new', 'forum_pending', 'forum_approved', 'forum_mod_call', 'forum_mod_approved',
                    'donor_wall', 'founder_wall', 'muro_de_fundadores', 'invite_opened') then 'comunidad'
    when p_type like 'exencion_%' or p_type like 'membership_paid%' or p_type in (
                    'commission_paid', 'donation_thanks', 'pago_terapia',
                    'founder_request', 'founder_request_approved', 'fundador_resolicita',
                    'empresa_limitada', 'empresa_reactivada', 'empresa_sin_directorio',
                    'directory_grace', 'stock_agotado') then 'transacciones'
    when p_type = 'campaign' then 'campanas'
    else 'otras'
  end;
$function$;
