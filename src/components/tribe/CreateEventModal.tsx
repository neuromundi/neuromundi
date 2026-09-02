/**
 * CreateEventModal — publica un evento de la Tribu. La GUÍA DE ANTICIPACIÓN es
 * obligatoria: qué pasará (agenda), lugar, expectativa de ruido y si habrá SALA
 * DE CALMA. Sin esos campos no se puede publicar. Al publicar, el creador recibe
 * +20 Puntos de Tribu.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, useToast } from '@/components/ui';
import { useTribeEvents, type EventInput } from '@/hooks/useTribeEvents';
import { useCountryLabel } from '@/lib/countryLabel';
import { COUNTRIES } from '@/data/countries';

const inputCls = 'w-full rounded-xl border border-slate-200 p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
const labelCls = 'mb-1 block text-sm font-semibold text-slate-800';

export function CreateEventModal({ onClose, onCreated, section }: { onClose: () => void; onCreated?: () => void; section?: string | null }) {
  const { t } = useTranslation();
  const toast = useToast();
  const countryLabel = useCountryLabel();
  const { create } = useTribeEvents('');
  const [f, setF] = useState<Omit<EventInput, 'starts_at'> & { when: string }>({
    title: '', description: '', when: '', location: '', is_online: false, city: '', country: '', noise: '', quiet_room: false, sensory_tips: '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (f.title.trim().length < 3 || f.description.trim().length < 5 || f.noise.trim() === '' || !f.when) {
      toast.error(t('tribe.event.guideReq')); return;
    }
    setBusy(true);
    const err = await create({
      title: f.title, description: f.description, starts_at: new Date(f.when).toISOString(),
      location: f.location, is_online: f.is_online, city: f.city, country: f.country,
      noise: f.noise, quiet_room: f.quiet_room, sensory_tips: f.sensory_tips, section: section ?? null,
    });
    setBusy(false);
    if (err) toast.error(err);
    else { toast.success(t('tribe.event.created')); onCreated?.(); onClose(); }
  };

  return (
    <Modal open onClose={onClose} title={t('tribe.event.newTitle')} description={t('tribe.event.guideHint')}
      footer={<Button onClick={submit} loading={busy}>{t('tribe.event.publish')}</Button>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className={labelCls}>{t('tribe.event.title')} *</label><input className={inputCls} value={f.title} onChange={(e) => set('title', e.target.value)} /></div>
        <div><label className={labelCls}>{t('tribe.event.when')} *</label><input type="datetime-local" className={inputCls} value={f.when} onChange={(e) => set('when', e.target.value)} /></div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700"><input type="checkbox" checked={f.is_online} onChange={(e) => set('is_online', e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-brand-500" /> {t('tribe.event.online')}</label>
        {!f.is_online && <div className="sm:col-span-2"><label className={labelCls}>{t('tribe.event.place')}</label><input className={inputCls} value={f.location} onChange={(e) => set('location', e.target.value)} placeholder={t('tribe.event.placePh')} /></div>}
        <div>
          <label className={labelCls}>{t('tribe.country')}</label>
          <select className={inputCls} value={f.country} onChange={(e) => set('country', e.target.value)}>
            <option value="">{t('tribe.anyCountry')}</option>
            {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{countryLabel(c.code, c.name)}</option>)}
          </select>
        </div>
        <div><label className={labelCls}>{t('tribe.city')}</label><input className={inputCls} value={f.city} onChange={(e) => set('city', e.target.value)} /></div>

        <div className="sm:col-span-2"><label className={labelCls}>{t('tribe.event.whatHappens')} *</label><textarea rows={3} className={inputCls} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder={t('tribe.event.whatPh')} /></div>
        <div className="sm:col-span-2"><label className={labelCls}>{t('tribe.event.noise')} *</label><input className={inputCls} value={f.noise} onChange={(e) => set('noise', e.target.value)} placeholder={t('tribe.event.noisePh')} /></div>
        <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2"><input type="checkbox" checked={f.quiet_room} onChange={(e) => set('quiet_room', e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-brand-500" /> {t('tribe.event.quietRoom')}</label>
        <div className="sm:col-span-2"><label className={labelCls}>{t('tribe.event.sensoryTips')}</label><textarea rows={2} className={inputCls} value={f.sensory_tips} onChange={(e) => set('sensory_tips', e.target.value)} placeholder={t('tribe.event.sensoryPh')} /></div>
      </div>
      <p className="mt-2 text-xs text-muted">{t('tribe.event.pointsHint')}</p>
    </Modal>
  );
}
