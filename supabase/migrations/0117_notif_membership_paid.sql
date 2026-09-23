-- 0117: clasifica el nuevo tipo de notificación 'membership_paid' (confirmación
-- de pago de membresía al miembro + aviso al admin, insertado por stripe-webhook)
-- en la categoría 'transacciones', para que respete las preferencias de push.
-- Idempotente (create or replace).
create or replace function public.notif_category(p_type text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select case
    when p_type like 'appt_%' or p_type in ('booking_request', 'waitlist_slot') then 'citas'
    when p_type in ('direct_message', 'admin_message', 'account_costo') then 'mensajes'
    when p_type in ('post_achievement', 'badge', 'waitlist_join', 'referral_use', 'referral_reward', 'directory_match', 'suspension_reminder', 'topic_job', 'topic_venue',
                    'forum_new', 'forum_pending', 'forum_approved', 'forum_mod_call', 'forum_mod_approved') then 'comunidad'
    when p_type in ('commission_paid', 'donation_thanks', 'membership_paid') then 'transacciones'
    when p_type = 'campaign' then 'campanas'
    else 'otras'
  end;
$function$;
