/**
 * MyAppointments — citas del consumidor (paciente/padre): ver, añadir a
 * calendario (.ics / Google) y cancelar.
 */
import { useTranslation } from 'react-i18next';
import { CalendarClock, Video, Download, ExternalLink, CreditCard } from 'lucide-react';
import { SkeletonCard, useToast, useConfirm, HowTo} from '@/components/ui';
import { useMyAppointments } from '@/hooks/useAgenda';
import { useConsumerPayments } from '@/hooks/usePayments';
import { downloadICS, googleCalendarUrl, type CalendarEvent } from '@/lib/calendar';

const STATUS_KEY: Record<string, string> = {
  booked: 'agenda.statusBooked',
  cancelled: 'agenda.statusCancelled',
  completed: 'agenda.statusCompleted',
  no_show: 'agenda.statusNoShow',
};

export function MyAppointments() {
  const { t } = useTranslation();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const { appointments, loading, cancel } = useMyAppointments();
  const { pay } = useConsumerPayments();

  if (loading) return <SkeletonCard rows={3} />;
  if (appointments.length === 0) return <p className="p-4 text-sm text-muted">{t('agenda.noAppointments')}</p>;

  return (
    <div className="space-y-3">
      <HowTo stepsKey="howto.appointments" />
      <ul className="space-y-3">
      {appointments.map((a) => {
        const event: CalendarEvent = {
          title: t('agenda.book'),
          startsAt: a.starts_at,
          endsAt: a.ends_at,
          description: a.video_link ?? '',
        };
        return (
          <li key={a.id} className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
                <CalendarClock className="h-4 w-4 text-brand-600" />
                {new Date(a.starts_at).toLocaleString()}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{t(STATUS_KEY[a.status] ?? a.status)}</span>
            </div>

            {a.video_link && (
              <a href={a.video_link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm text-brand-700 hover:underline">
                <Video className="h-4 w-4" /> {a.video_link}
              </a>
            )}

            {a.status === 'booked' && (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <button type="button" onClick={() => downloadICS(event)} className="inline-flex items-center gap-1.5 text-brand-700 hover:underline">
                  <Download className="h-4 w-4" /> {t('agenda.downloadIcs')}
                </button>
                <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-brand-700 hover:underline">
                  <ExternalLink className="h-4 w-4" /> {t('agenda.google')}
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await pay(a.provider_id, { appointmentId: a.id, kind: 'consultation' });
                    if (!res.ok) toast.error(res.error || t('pay.payError'));
                  }}
                  className="inline-flex items-center gap-1.5 text-brand-700 hover:underline"
                >
                  <CreditCard className="h-4 w-4" /> {t('pay.payConsultation')}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!(await confirmDialog({ title: t('agenda.cancel'), message: t('agenda.confirmCancel'), danger: true }))) return;
                    const res = await cancel(a.id);
                    toast[res.ok ? 'success' : 'error'](res.ok ? t('agenda.cancelled') : res.error);
                  }}
                  className="ml-auto text-evs-1 hover:underline"
                >
                  {t('agenda.cancel')}
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
    </div>
  );
}
