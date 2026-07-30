/**
 * EsparcimientoInfo — muestra en el perfil público de un lugar de Esparcimiento
 * (provider_type = 'tourism') sus datos de accesibilidad: tipo de lugar, horarios
 * de bajo impacto sensorial, adaptaciones cognitivas y otras, y un enlace a su
 * ubicación en el mapa. Lee de provider_details. No renderiza nada si no hay datos.
 */
import { useTranslation } from 'react-i18next';
import { Ticket, Volume2, Brain, Sparkles, MapPin } from 'lucide-react';
import { useCatLabel } from '@/lib/catLabel';
import { VENUE_TYPES } from '@/data/esparcimientoCatalog';

export function EsparcimientoInfo({ details }: { details: Record<string, unknown> | null }) {
  const { t } = useTranslation();
  const catLabel = useCatLabel();
  const d = (details ?? {}) as {
    venue_type?: string; sensory_hours?: string; cognitive_adaptations?: string;
    other_adaptations?: string; map_url?: string; city?: string; address_text?: string;
  };
  const venue = d.venue_type?.trim();
  const sensory = d.sensory_hours?.trim();
  const cognitive = d.cognitive_adaptations?.trim();
  const other = d.other_adaptations?.trim();
  const map = d.map_url?.trim();

  if (!venue && !sensory && !cognitive && !other && !map) return null;

  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
        <Ticket className="h-4 w-4 text-brand-600" aria-hidden="true" /> {t('esp.infoTitle')}
      </h2>
      <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4">
        {venue && (
          <p><span className="inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">{catLabel(venue, VENUE_TYPES.find((v) => v.value === venue)?.label ?? venue)}</span></p>
        )}
        {sensory && (
          <p className="flex items-start gap-2 text-sm text-slate-700">
            <Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <span><span className="font-semibold text-slate-900">{t('esp.sensoryHours')}:</span> {sensory}</span>
          </p>
        )}
        {cognitive && (
          <p className="flex items-start gap-2 text-sm text-slate-700">
            <Brain className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <span><span className="font-semibold text-slate-900">{t('esp.cognitive')}:</span> {cognitive}</span>
          </p>
        )}
        {other && (
          <p className="flex items-start gap-2 text-sm text-slate-700">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <span><span className="font-semibold text-slate-900">{t('esp.otherAdapt')}:</span> {other}</span>
          </p>
        )}
        {map && (
          <a href={map} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
            <MapPin className="h-4 w-4" /> {t('esp.viewMap')}
          </a>
        )}
      </div>
    </section>
  );
}
