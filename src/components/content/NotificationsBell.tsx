/**
 * NotificationsBell — campana en el header con contador de no leídas y un panel
 * desplegable. Para el logro de 3 estrellas muestra el informe de cuántas
 * personas consultaron la publicación.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Trophy, Award, CalendarClock, Megaphone, MessageSquare, Users } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

export function NotificationsBell() {
  const { t } = useTranslation();
  const { items, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100"
        aria-label={t('notif.title')}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-evs-1 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-2 shadow-xl">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-sm font-semibold text-slate-900">{t('notif.title')}</span>
            {unreadCount > 0 && (
              <button type="button" onClick={() => void markAllRead()} className="text-xs text-brand-700 hover:underline">
                {t('notif.markAll')}
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted">{t('notif.empty')}</p>
          ) : (
            <ul className="space-y-1">
              {items.map((n) => {
                const isAchievement = n.type === 'post_achievement';
                const isBadge = n.type === 'badge';
                const count = Number((n.data as { count?: number })?.count ?? 0);
                const isAppt = n.type.startsWith('appt_');
                const isMsg = n.type === 'admin_message';
                const isDM = n.type === 'direct_message';
                const isBooking = n.type === 'booking_request';
                const isWaitSlot = n.type === 'waitlist_slot';
                const isWaitJoin = n.type === 'waitlist_join';
                const isCampaign = n.type === 'campaign';
                const ad = (n.data ?? {}) as { specialist_name?: string; recipient_name?: string; reason?: string; title?: string; from_name?: string };
                const apptSuffix = n.type.replace('appt_', '');
                const apptTitle = isAppt ? t(`notif.appt.${apptSuffix}.title`) : n.title;
                const apptBody = isAppt ? t(`notif.appt.${apptSuffix}.body`, { name: ad.specialist_name || ad.recipient_name || '', title: ad.title || '', reason: ad.reason || '' }) : n.body;
                const rowTitle = isBooking ? t('notif.booking.title') : isDM ? t('notif.dm.title') : isWaitSlot ? t('notif.waitlist.title') : isWaitJoin ? t('notif.waitlist.join') : apptTitle;
                const rowBody = isBooking ? t('notif.booking.body', { name: (n.data as { name?: string } | null)?.name ?? '' }) : isDM ? t('notif.dm.body', { name: ad.from_name || '' }) : apptBody;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => !n.is_read && void markRead(n.id)}
                      className={`w-full rounded-xl p-2.5 text-left ${n.is_read ? 'bg-white' : 'bg-brand-50'}`}
                    >
                      <div className="flex items-center gap-2">
                        {isAchievement && <Trophy className="h-4 w-4 shrink-0 text-warm-500" />}
                        {isBadge && <Award className="h-4 w-4 shrink-0 text-brand-600" />}
                        {isAppt && <CalendarClock className="h-4 w-4 shrink-0 text-brand-600" />}
                        {isMsg && <Megaphone className="h-4 w-4 shrink-0 text-brand-600" />}
                        {isDM && <MessageSquare className="h-4 w-4 shrink-0 text-brand-600" />}
                        {isBooking && <CalendarClock className="h-4 w-4 shrink-0 text-brand-600" />}
                        {(isWaitSlot || isWaitJoin) && <Users className="h-4 w-4 shrink-0 text-brand-600" />}
                        {isCampaign && <Megaphone className="h-4 w-4 shrink-0 text-brand-600" />}
                        <span className="text-sm font-semibold text-slate-900">{rowTitle}</span>
                      </div>
                      {rowBody && <p className="mt-0.5 text-sm text-slate-600">{rowBody}</p>}
                      {isAchievement && (
                        <p className="mt-1 text-xs text-muted">
                          {t('notif.viewersReport', { count })} · {t('notif.keepGoing')}
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
