/**
 * WaitlistPanel — lista de espera del especialista (Funcionalidad 6).
 * Alta por folio, cambio de estado y aviso manual de hueco disponible. El aviso
 * automático cuando una cita se rechaza o cancela lo dispara la base de datos.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, UserPlus, BellRing, Check, X } from 'lucide-react';
import { Button, useToast, SkeletonCard, EmptyState, HowTo } from '@/components/ui';
import { useWaitlist } from '@/hooks/useWaitlist';
import { formatDate } from '@/lib/utils';

const inputCls =
  'w-full rounded-xl border border-slate-200 p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

export function WaitlistPanel() {
  const { t } = useTranslation();
  const toast = useToast();
  const { rows, waiting, loading, addByFolio, setStatus, notifySlot } = useWaitlist();
  const [folio, setFolio] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const onAdd = async () => {
    const digits = folio.replace(/\D/g, '');
    if (!digits) { toast.error(t('wait.badFolio')); return; }
    setBusy(true);
    const r = await addByFolio(Number(digits), note.trim());
    setBusy(false);
    if (!r.ok) { toast.error(t(`wait.err.${r.error}`, t('wait.err.generic'))); return; }
    setFolio(''); setNote('');
    toast.success(t('wait.added'));
  };

  const onNotify = async () => {
    setBusy(true);
    const r = await notifySlot(msg.trim());
    setBusy(false);
    if (!r.ok) { toast.error(t('wait.err.generic')); return; }
    setMsg('');
    toast.success(t('wait.notified', { count: r.data }));
  };

  return (
    <div className="space-y-4">
      <HowTo stepsKey="howto.waitlist" />
      <p className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
        {t('wait.autoHint')}
      </p>

      {/* Alta por folio */}
      <section className="space-y-2 rounded-2xl border border-slate-100 p-4">
        <h3 className="flex items-center gap-2 font-semibold text-slate-900">
          <UserPlus className="h-4 w-4 text-brand-600" aria-hidden="true" /> {t('wait.addTitle')}
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className={inputCls} value={folio} onChange={(e) => setFolio(e.target.value)} placeholder="NM-000123" />
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('wait.notePlaceholder')} />
        </div>
        <Button size="sm" loading={busy} onClick={onAdd}>{t('wait.add')}</Button>
      </section>

      {/* Aviso de hueco */}
      <section className="space-y-2 rounded-2xl border border-slate-100 p-4">
        <h3 className="flex items-center gap-2 font-semibold text-slate-900">
          <BellRing className="h-4 w-4 text-brand-600" aria-hidden="true" /> {t('wait.notifyTitle')}
        </h3>
        <input className={inputCls} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={t('wait.notifyPlaceholder')} />
        <Button size="sm" variant="secondary" loading={busy} disabled={waiting.length === 0} onClick={onNotify}>
          {t('wait.notify', { count: waiting.length })}
        </Button>
      </section>

      {/* Lista */}
      {loading ? (
        <SkeletonCard rows={2} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title={t('wait.emptyTitle')} description={t('wait.empty')} />
      ) : (
        <ul className="space-y-2">
          {rows.map((w) => (
            <li key={w.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{w.patient_name ?? '—'}</p>
                <p className="text-xs text-muted">
                  {w.patient_member_no != null ? `NM-${String(w.patient_member_no).padStart(6, '0')} · ` : ''}
                  {t(`wait.status.${w.status}`)} · {formatDate(w.created_at)}
                </p>
                {w.note ? <p className="mt-0.5 text-sm text-slate-600">{w.note}</p> : null}
              </div>
              {w.status === 'waiting' && (
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="secondary" onClick={() => void setStatus(w.id, 'assigned')} leadingIcon={<Check className="h-4 w-4" />}>
                    {t('wait.assign')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void setStatus(w.id, 'cancelled')} leadingIcon={<X className="h-4 w-4" />}>
                    {t('wait.remove')}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
