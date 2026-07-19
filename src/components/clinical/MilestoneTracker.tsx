/**
 * MilestoneTracker — rastreador de hitos LOCAL-FIRST. Los datos viven solo en
 * este dispositivo (IndexedDB). Permite imprimir/guardar PDF y exportar JSON.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Printer, Download, MapPin } from 'lucide-react';
import { Button } from '@/components/ui';
import { useTracker } from '@/hooks/useTracker';

const input = 'rounded-lg border border-slate-200 p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

export function MilestoneTracker() {
  const { t } = useTranslation();
  const { items, add, remove, exportJson } = useTracker();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [area, setArea] = useState('');
  const [text, setText] = useState('');

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-brand-600" />
        <h3 className="font-semibold text-slate-900">{t('clin.trackerTitle')}</h3>
      </div>
      <p className="mb-3 text-xs text-muted">{t('clin.trackerNote')}</p>

      <div className="mb-3 flex flex-wrap gap-2">
        <input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />
        <input className={input} placeholder={t('clin.area')} value={area} onChange={(e) => setArea(e.target.value)} />
        <input className={`${input} min-w-[12rem] flex-1`} placeholder={t('clin.milestone')} value={text} onChange={(e) => setText(e.target.value)} />
        <Button size="sm" leadingIcon={<Plus className="h-4 w-4" />}
          onClick={() => { if (!text.trim()) return; void add({ date, area: area.trim(), text: text.trim() }); setText(''); setArea(''); }}>
          {t('clin.addMilestone')}
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted">{t('clin.noMilestones')}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((m) => (
            <li key={m.id} className="flex items-start gap-2 rounded-xl border border-slate-100 p-2 text-sm">
              <span className="w-24 shrink-0 text-xs text-muted">{m.date}</span>
              <div className="min-w-0 flex-1">
                {m.area && <span className="mr-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{m.area}</span>}
                <span className="text-slate-800">{m.text}</span>
              </div>
              <button type="button" onClick={() => void remove(m.id)} className="text-evs-1 hover:opacity-80"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => window.print()} leadingIcon={<Printer className="h-4 w-4" />}>{t('clin.print')}</Button>
          <Button size="sm" variant="ghost" onClick={exportJson} leadingIcon={<Download className="h-4 w-4" />}>{t('clin.exportJson')}</Button>
        </div>
      )}
    </section>
  );
}
