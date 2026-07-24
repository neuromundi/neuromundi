/**
 * NotificationPrefs — centro de preferencias de notificación.
 *
 * Un interruptor MAESTRO de push y, debajo, un interruptor por categoría para
 * silenciar el push de lo que no interese (citas, mensajes, comunidad,
 * transacciones, campañas, otras). La campana in-app siempre conserva todo; esto
 * solo controla qué se empuja al dispositivo.
 */
import { useTranslation } from 'react-i18next';
import { Bell, BellOff } from 'lucide-react';
import { SkeletonCard, useToast } from '@/components/ui';
import { useNotificationPrefs } from '@/hooks/useNotificationPrefs';
import { NOTIF_CATEGORIES, type NotifCategory } from '@/lib/notificationPrefs';
import { cn } from '@/lib/utils';

/** Interruptor accesible reutilizable. */
function Toggle({ on, disabled, onChange, label }: { on: boolean; disabled?: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        disabled ? 'cursor-not-allowed bg-slate-200' : on ? 'bg-brand-600' : 'bg-slate-300',
      )}
    >
      <span className={cn('inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform', on ? 'translate-x-5' : 'translate-x-0.5')} />
    </button>
  );
}

export function NotificationPrefs() {
  const { t } = useTranslation();
  const toast = useToast();
  const { prefs, loading, setPushEnabled, toggleCategory } = useNotificationPrefs();

  if (loading) return <SkeletonCard rows={2} />;

  const onMaster = async (on: boolean) => {
    const ok = await setPushEnabled(on);
    if (!ok) toast.error(t('notifPrefs.error'));
  };

  const onCat = async (cat: NotifCategory, muted: boolean) => {
    const ok = await toggleCategory(cat, muted);
    if (!ok) toast.error(t('notifPrefs.error'));
  };

  return (
    <section className="space-y-3 rounded-2xl border border-slate-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-slate-900">
            {prefs.push_enabled ? <Bell className="h-5 w-5 text-brand-600" aria-hidden="true" /> : <BellOff className="h-5 w-5 text-muted" aria-hidden="true" />}
            {t('notifPrefs.title')}
          </h2>
          <p className="mt-0.5 text-sm text-muted">{t('notifPrefs.help')}</p>
        </div>
        <Toggle on={prefs.push_enabled} onChange={onMaster} label={t('notifPrefs.master')} />
      </div>

      {/* Categorías: se atenúan cuando el push maestro está apagado. */}
      <ul className={cn('divide-y divide-slate-100 rounded-xl border border-slate-100', !prefs.push_enabled && 'opacity-50')}>
        {NOTIF_CATEGORIES.map((cat) => {
          const muted = prefs.muted_categories.includes(cat);
          return (
            <li key={cat} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">{t(`notifPrefs.cat.${cat}`)}</p>
                <p className="text-xs text-muted">{t(`notifPrefs.catDesc.${cat}`)}</p>
              </div>
              <Toggle
                on={!muted}
                disabled={!prefs.push_enabled}
                onChange={(v) => void onCat(cat, !v)}
                label={t(`notifPrefs.cat.${cat}`)}
              />
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted">{t('notifPrefs.footnote')}</p>
    </section>
  );
}
