-- 0244 · M-7 (primera mitad): los tipos de aviso creados por las migraciones
-- recientes no estaban clasificados, asi que todos caian en 'otras'.
--
-- Importa porque la categoria es lo que el usuario silencia o no: un aviso de
-- que su ficha esta a punto de retirarse por falta de cuota no puede estar en
-- el mismo cajon que lo accesorio.
--
-- Este mapa debe coincidir EXACTO con notifCategory de src/lib/notificationPrefs.ts.
create or replace function public.notif_category(p_type text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select case
    when p_type like 'appt_%' or p_type in ('booking_request', 'waitlist_slot', 'reservas_en_rafaga') then 'citas'
    when p_type in ('direct_message', 'admin_message', 'account_costo', 'pregunta_experto') then 'mensajes'
    when p_type in ('post_achievement', 'badge', 'waitlist_join', 'referral_use', 'referral_reward',
                    'directory_match', 'suspension_reminder', 'topic_job', 'topic_venue',
                    'forum_new', 'forum_pending', 'forum_approved', 'forum_mod_call', 'forum_mod_approved',
                    'donor_wall', 'founder_wall', 'muro_de_fundadores', 'invite_opened') then 'comunidad'
    -- Dinero y permanencia en el directorio. Nada de esto deberia perderse por
    -- tener silenciada una categoria accesoria.
    when p_type in ('commission_paid', 'donation_thanks', 'membership_paid', 'pago_terapia',
                    'exencion_solicitada', 'exencion_resuelta', 'exencion_por_vencer',
                    'founder_request', 'founder_request_approved', 'fundador_resolicita',
                    'empresa_limitada', 'empresa_reactivada', 'empresa_sin_directorio',
                    'directory_grace', 'stock_agotado') then 'transacciones'
    when p_type = 'campaign' then 'campanas'
    else 'otras'
  end;
$function$;
