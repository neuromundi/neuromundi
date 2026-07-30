/**
 * EventsSection — eventos comunitarios de la Tribu en el hub. Muestra la guía de
 * anticipación (qué pasará, ruido, sala de calma), permite crear un evento (con
 * guía obligatoria), asistir (RSVP) y, para eventos pasados, aportar un reporte
 * de accesibilidad sensorial.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Plus, Volume2, ShieldCheck, MapPin, Users, Sparkles } from 'lucide-react';
import { Button, SkeletonCard, EmptyState } from '@/components/ui';
import { useTribeEvents, type TribeEvent } from '@/hooks/useTribeEvents';
import { CreateEventModal } from './CreateEventModal';
import { SensoryReportModal } from './SensoryReportModal';

function EventCard({ e, onRsvp, onReport }: { e: TribeEvent; onRsvp: (going: boolean) => void; onReport: () => void }) {
  const { t, i18n } = useTranslation();
  const when = new Date(e.starts_at).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' });
  const place = e.is_online ? t('tribe.event.online') : [e.location, e.city, e.country].filter(Boolean).join(', ');
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-slate-900">{e.title}</p>
          <p className="flex items-center gap-1 text-xs text-muted"><CalendarDays className="h-3 w-3" /> {when}{e.is_past && ` · ${t('tribe.event.past')}`}</p>
          {place && <p className="flex items-center gap-1 text-xs text-muted"><MapPin className="h-3 w-3" /> {place}</p>}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"><Users className="h-3 w-3" /> {e.going}</span>
      </div>

      {/* Guía de anticipación */}
      <div className="mt-3 space-y-1.5 rounded-xl bg-brand-50/40 p-3 text-sm">
        <p className="text-slate-700"><span className="font-semibold text-slate-900">{t('tribe.event.whatHappens')}:</span> {e.description}</p>
        <p className="flex items-start gap-1.5 text-slate-700"><Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> <span><span className="font-semibold text-slate-900">{t('tribe.event.noise')}:</span> {e.noise}</span></p>
        <p className="flex items-center gap-1.5 text-slate-700"><ShieldCheck className={`h-4 w-4 ${e.quiet_room ? 'text-emerald-600' : 'text-slate-300'}`} /> {e.quiet_room ? t('tribe.event.hasQuiet') : t('tribe.event.noQuiet')}</p>
        {e.sensory_tips && <p className="text-slate-600"><span className="font-semibold text-slate-900">{t('tribe.event.sensoryTips')}:</span> {e.sensory_tips}</p>}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant={e.i_going ? 'ghost' : 'secondary'} onClick={() => onRsvp(!e.i_going)}>
          {e.i_going ? t('tribe.event.cancelRsvp') : t('tribe.event.attend')}
        </Button>
        {e.is_past && !e.i_reported && (
          <Button size="sm" variant="ghost" leadingIcon={<Sparkles className="h-4 w-4" />} onClick={onReport}>{t('tribe.event.sensoryReport')}</Button>
        )}
        {e.i_reported && <span className="text-xs text-muted">{t('tribe.event.reportedTag')}</span>}
        <span className="text-xs text-muted">· {e.creator_name}</span>
      </div>
    </article>
  );
}

export function EventsSection() {
  const { t } = useTranslation();
  const { events, loading, rsvp, reload } = useTribeEvents('');
  const [creating, setCreating] = useState(false);
  const [reporting, setReporting] = useState<{ id: string; title: string } | null>(null);

  return (
    <section className="mt-6 rounded-2xl border border-slate-100 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <CalendarDays className="h-5 w-5 text-brand-600" aria-hidden="true" /> {t('tribe.event.title2')}
        </h2>
        <Button size="sm" onClick={() => setCreating(true)} leadingIcon={<Plus className="h-4 w-4" />}>{t('tribe.event.new')}</Button>
      </div>

      <div className="mt-4">
        {loading ? (
          <SkeletonCard rows={3} />
        ) : events.length === 0 ? (
          <EmptyState icon={<CalendarDays className="h-6 w-6" />} title={t('tribe.event.emptyTitle')} description={t('tribe.event.empty')} />
        ) : (
          <div className="space-y-3">
            {events.map((e) => (
              <EventCard key={e.id} e={e} onRsvp={(going) => void rsvp(e.id, going)} onReport={() => setReporting({ id: e.id, title: e.title })} />
            ))}
          </div>
        )}
      </div>

      {creating && <CreateEventModal onClose={() => setCreating(false)} onCreated={() => void reload()} />}
      {reporting && <SensoryReportModal eventId={reporting.id} eventTitle={reporting.title} onClose={() => setReporting(null)} onDone={() => void reload()} />}
    </section>
  );
}
