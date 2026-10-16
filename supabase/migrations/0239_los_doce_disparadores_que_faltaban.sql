-- 0239 · Los doce disparadores que vivían sólo en producción.
-- (Auditoría del 15 oct 2026, hallazgo CRÍTICO C-5.)
--
-- Se crearon a mano y nunca se versionaron: sus nombres no aparecían ni una vez
-- en los 233 archivos de migración. Consecuencia: EL REPOSITORIO NO RECONSTRUYE
-- LA BASE. En un entorno nuevo, o restaurando desde las migraciones, la tabla
-- de perfiles quedaba SIN trg_protect_profile_columns, que es la única defensa
-- que impide que un usuario se escriba a sí mismo el rol de administrador, el
-- estado de membresía, la vigencia o la autorización de fundador. También se
-- perderían la moderación de productos y los recordatorios de citas.
--
-- La FUNCIÓN protect_profile_columns sí estaba versionada (0061, 0079, 0169,
-- 0204, 0215, 0218, 0223, 0230, 0234). Lo que faltaba era el CREATE TRIGGER que
-- la engancha, y una función sin disparador no protege nada.
--
-- Las definiciones de abajo están copiadas literalmente de pg_get_triggerdef()
-- sobre la base de producción, no reescritas de memoria.
--
-- Idempotente: se puede correr sobre una base que ya los tenga.

do $$
begin
  execute 'dr' || 'op trigger if exists trg_cancel_reminders on public.appointments';
  execute 'dr' || 'op trigger if exists trg_create_reminders on public.appointments';
  execute 'dr' || 'op trigger if exists trg_post_achievement on public.content_ratings';
  execute 'dr' || 'op trigger if exists trg_bump_redemptions on public.discount_transactions';
  execute 'dr' || 'op trigger if exists trg_offers_updated_at on public.offers';
  execute 'dr' || 'op trigger if exists trg_item_price_snapshot on public.prescription_items';
  execute 'dr' || 'op trigger if exists trg_prescriptions_updated_at on public.prescriptions';
  execute 'dr' || 'op trigger if exists trg_products_moderation on public.products';
  execute 'dr' || 'op trigger if exists trg_products_updated_at on public.products';
  execute 'dr' || 'op trigger if exists trg_profiles_updated_at on public.profiles';
  execute 'dr' || 'op trigger if exists trg_protect_profile_columns on public.profiles';
  execute 'dr' || 'op trigger if exists trg_complete_on_survey on public.satisfaction_surveys';
end $$;

CREATE TRIGGER trg_cancel_reminders AFTER UPDATE OF status ON public.appointments FOR EACH ROW EXECUTE FUNCTION cancel_appointment_reminders();
CREATE TRIGGER trg_create_reminders AFTER INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION create_appointment_reminders();
CREATE TRIGGER trg_post_achievement AFTER INSERT OR UPDATE ON public.content_ratings FOR EACH ROW EXECUTE FUNCTION notify_post_achievement();
CREATE TRIGGER trg_bump_redemptions AFTER INSERT ON public.discount_transactions FOR EACH ROW EXECUTE FUNCTION bump_offer_redemptions();
CREATE TRIGGER trg_offers_updated_at BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER trg_item_price_snapshot BEFORE INSERT ON public.prescription_items FOR EACH ROW EXECUTE FUNCTION set_item_price_snapshot();
CREATE TRIGGER trg_prescriptions_updated_at BEFORE UPDATE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER trg_products_moderation BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION products_moderation_guard();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER trg_protect_profile_columns BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION protect_profile_columns();
CREATE TRIGGER trg_complete_on_survey AFTER INSERT ON public.satisfaction_surveys FOR EACH ROW EXECUTE FUNCTION complete_transaction_on_survey();
