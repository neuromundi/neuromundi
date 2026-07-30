/**
 * JobsPanel — gestor de vacantes de una Empresa inclusiva. Crea, edita, oculta
 * (marca como no activa) y elimina vacantes. Todos los campos son OPCIONALES.
 * Las vacantes activas salen públicas en /inclusion-laboral.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Eye, EyeOff, Save, X, Briefcase } from 'lucide-react';
import { Button, SkeletonCard, EmptyState, useToast, useConfirm } from '@/components/ui';
import { useMyJobs, type JobOpening, type JobPatch } from '@/hooks/useJobOpenings';
import { useCountryLabel } from '@/lib/countryLabel';
import { COUNTRIES } from '@/data/countries';

const inputCls = 'w-full rounded-xl border border-slate-200 p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
const labelCls = 'mb-1 block text-sm font-semibold text-slate-800';

const EMPTY: JobPatch = {
  opportunity_type: 'employment',
  positions: null, title: '', experience: '', education: '', salary_text: '',
  country: '', city: '', skills: '', apply_email: '', apply_url: '', note: '',
};

const OPP_TYPES = ['employment', 'volunteering', 'social_service'] as const;

function JobForm({ initial, onCancel, onSave }: { initial?: JobOpening; onCancel: () => void; onSave: (p: JobPatch) => Promise<boolean> }) {
  const { t } = useTranslation();
  const countryLabel = useCountryLabel();
  const toast = useToast();
  const [f, setF] = useState<JobPatch>(initial ? { ...initial } : { ...EMPTY });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof JobPatch, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setBusy(true);
    const positions = f.positions != null && String(f.positions).trim() !== '' ? Number(f.positions) : null;
    const ok = await onSave({ ...f, positions: Number.isNaN(positions as number) ? null : positions });
    setBusy(false);
    if (!ok) toast.error(t('jobs.saveErr'));
    else onCancel();
  };

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls}>{t('jobs.opportunityType')}</label>
          <select className={inputCls} value={f.opportunity_type ?? 'employment'} onChange={(e) => set('opportunity_type', e.target.value)}>
            {OPP_TYPES.map((ot) => <option key={ot} value={ot}>{t(`jobs.type.${ot}`)}</option>)}
          </select>
        </div>
        <div><label className={labelCls}>{t('jobs.title')}</label><input className={inputCls} value={f.title ?? ''} onChange={(e) => set('title', e.target.value)} /></div>
        <div><label className={labelCls}>{t('jobs.positions')}</label><input type="number" min="0" className={inputCls} value={f.positions ?? ''} onChange={(e) => set('positions', e.target.value)} /></div>
        <div><label className={labelCls}>{t('jobs.experience')}</label><input className={inputCls} value={f.experience ?? ''} onChange={(e) => set('experience', e.target.value)} /></div>
        <div><label className={labelCls}>{t('jobs.education')}</label><input className={inputCls} value={f.education ?? ''} onChange={(e) => set('education', e.target.value)} /></div>
        <div><label className={labelCls}>{t('jobs.salary')}</label><input className={inputCls} placeholder={t('jobs.salaryPlaceholder')} value={f.salary_text ?? ''} onChange={(e) => set('salary_text', e.target.value)} /></div>
        <div>
          <label className={labelCls}>{t('reg.country')}</label>
          <select className={inputCls} value={f.country ?? ''} onChange={(e) => set('country', e.target.value)}>
            <option value="">{t('reg.selectCountry')}</option>
            {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{countryLabel(c.code, c.name)}</option>)}
          </select>
        </div>
        <div><label className={labelCls}>{t('jobs.city')}</label><input className={inputCls} value={f.city ?? ''} onChange={(e) => set('city', e.target.value)} /></div>
        <div><label className={labelCls}>{t('jobs.applyEmail')}</label><input type="email" className={inputCls} value={f.apply_email ?? ''} onChange={(e) => set('apply_email', e.target.value)} /></div>
        <div className="sm:col-span-2"><label className={labelCls}>{t('jobs.applyUrl')}</label><input className={inputCls} placeholder="https://" value={f.apply_url ?? ''} onChange={(e) => set('apply_url', e.target.value)} /></div>
        <div className="sm:col-span-2"><label className={labelCls}>{t('jobs.skills')}</label><textarea rows={2} className={inputCls} value={f.skills ?? ''} onChange={(e) => set('skills', e.target.value)} /></div>
        <div className="sm:col-span-2"><label className={labelCls}>{t('jobs.note')}</label><textarea rows={2} className={inputCls} value={f.note ?? ''} onChange={(e) => set('note', e.target.value)} /></div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" loading={busy} onClick={() => void save()} leadingIcon={<Save className="h-4 w-4" />}>{t('jobs.save')}</Button>
        <Button size="sm" variant="ghost" onClick={onCancel} leadingIcon={<X className="h-4 w-4" />}>{t('jobs.cancel')}</Button>
      </div>
    </div>
  );
}

function JobRow({ job, onToggle, onEdit, onDelete }: { job: JobOpening; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-white p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-900">{job.title || t('jobs.untitled')}</p>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
          {job.positions != null && <span>{t('jobs.positionsShort', { n: job.positions })}</span>}
          {job.city && <span>{job.city}</span>}
          {job.country && <span>{job.country}</span>}
          {!job.is_active && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">{t('jobs.hidden')}</span>}
        </p>
      </div>
      <button type="button" onClick={onToggle} title={job.is_active ? t('jobs.hide') : t('jobs.show')} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-50">
        {job.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>
      <button type="button" onClick={onEdit} title={t('jobs.edit')} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-50"><Pencil className="h-4 w-4" /></button>
      <button type="button" onClick={onDelete} title={t('jobs.delete')} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
    </div>
  );
}

export function JobsPanel({ companyId }: { companyId: string }) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { jobs, loading, create, update, remove } = useMyJobs(companyId);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<JobOpening | null>(null);

  const activeCount = useMemo(() => jobs.filter((j) => j.is_active).length, [jobs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Briefcase className="h-5 w-5 text-brand-600" aria-hidden="true" /> {t('jobs.tab')}
          </h2>
          <p className="text-sm text-muted">{t('jobs.subtitle', { active: activeCount, total: jobs.length })}</p>
        </div>
        {!adding && !editing && (
          <Button size="sm" onClick={() => setAdding(true)} leadingIcon={<Plus className="h-4 w-4" />}>{t('jobs.new')}</Button>
        )}
      </div>

      {adding && (
        <JobForm onCancel={() => setAdding(false)} onSave={(p) => create(p)} />
      )}
      {editing && (
        <JobForm initial={editing} onCancel={() => setEditing(null)} onSave={(p) => update(editing.id, p)} />
      )}

      {loading ? (
        <SkeletonCard rows={3} />
      ) : jobs.length === 0 && !adding ? (
        <EmptyState icon={<Briefcase className="h-6 w-6" />} title={t('jobs.emptyTitle')} description={t('jobs.empty')} />
      ) : (
        <div className="space-y-2">
          {jobs.map((j) => (
            <JobRow
              key={j.id}
              job={j}
              onToggle={() => void update(j.id, { is_active: !j.is_active })}
              onEdit={() => { setAdding(false); setEditing(j); }}
              onDelete={async () => {
                const ok = await confirm({ title: t('jobs.delete'), message: t('jobs.deleteConfirm') });
                if (ok) void remove(j.id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
