/**
 * AdminMemberBadges — el admin sube/baja los distintivos descargables por tipo de
 * miembro. Sube una imagen (PNG/SVG/JPG) para un (tipo de miembro, clave), la
 * activa/desactiva o la elimina. Los miembros de ese tipo la descargan desde su
 * panel (MemberBadgesCard).
 */
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Award, Upload, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Button, SkeletonCard, EmptyState, useToast, useConfirm } from '@/components/ui';
import { useAdminMemberBadges, type AdminBadge } from '@/hooks/useAdminMemberBadges';

/** Tipos de miembro para los que se pueden cargar distintivos. */
const MEMBER_TYPES = [
  'families', 'service_provider', 'merchant', 'school', 'clinic',
  'wellness', 'tourism', 'legal', 'ngo', 'caregiver', 'company', 'founder',
] as const;

const inputCls = 'w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

function UploadForm({ onUpload }: { onUpload: ReturnType<typeof useAdminMemberBadges>['upload'] }) {
  const { t } = useTranslation();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [memberType, setMemberType] = useState<string>('company');
  const [badgeKey, setBadgeKey] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!badgeKey.trim() || !file) { toast.error(t('adm.badges.needFields')); return; }
    setBusy(true);
    const err = await onUpload(memberType, badgeKey.trim(), title.trim(), file);
    setBusy(false);
    if (err) { toast.error(err); return; }
    toast.success(t('adm.badges.uploaded'));
    setBadgeKey(''); setTitle(''); setFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{t('adm.badges.addTitle')}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">{t('adm.badges.memberType')}</label>
          <select className={inputCls} value={memberType} onChange={(e) => setMemberType(e.target.value)}>
            {MEMBER_TYPES.map((m) => <option key={m} value={m}>{t(`adm.badges.type.${m}`, { defaultValue: m })}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">{t('adm.badges.key')}</label>
          <input className={inputCls} value={badgeKey} onChange={(e) => setBadgeKey(e.target.value)} placeholder="empresa_inclusiva / aliado_neuromundi" list="badge-keys" />
          <datalist id="badge-keys">
            <option value="empresa_inclusiva" />
            <option value="aliado_neuromundi" />
          </datalist>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-700">{t('adm.badges.badgeTitle')}</label>
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Empresa inclusiva" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-700">{t('adm.badges.file')}</label>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className={inputCls} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
      </div>
      <Button className="mt-3" size="sm" loading={busy} onClick={() => void submit()} leadingIcon={<Upload className="h-4 w-4" />}>{t('adm.badges.upload')}</Button>
    </div>
  );
}

function BadgeRow({ b, onToggle, onDelete }: { b: AdminBadge; onToggle: () => void; onDelete: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3">
      {b.public_url ? (
        <img src={b.public_url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-contain" />
      ) : (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Award className="h-5 w-5" /></span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{b.title || b.badge_key}</p>
        <p className="flex flex-wrap gap-x-2 text-xs text-muted">
          <span>{t(`adm.badges.type.${b.member_type}`, { defaultValue: b.member_type })}</span>
          <span className="font-mono">{b.badge_key}</span>
          {!b.is_active && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">{t('adm.badges.down')}</span>}
        </p>
      </div>
      <button type="button" onClick={onToggle} title={b.is_active ? t('adm.badges.takeDown') : t('adm.badges.putUp')} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-50">
        {b.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>
      <button type="button" onClick={onDelete} title={t('adm.badges.delete')} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
    </div>
  );
}

export function AdminMemberBadges() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { badges, loading, upload, setActive, remove } = useAdminMemberBadges();
  const activeCount = useMemo(() => badges.filter((b) => b.is_active).length, [badges]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Award className="h-5 w-5 text-brand-600" aria-hidden="true" /> {t('adm.badges.title')}
        </h2>
        <p className="text-sm text-muted">{t('adm.badges.subtitle', { active: activeCount, total: badges.length })}</p>
      </div>

      <UploadForm onUpload={upload} />

      {loading ? (
        <SkeletonCard rows={3} />
      ) : badges.length === 0 ? (
        <EmptyState icon={<Award className="h-6 w-6" />} title={t('adm.badges.emptyTitle')} description={t('adm.badges.empty')} />
      ) : (
        <div className="space-y-2">
          {badges.map((b) => (
            <BadgeRow
              key={b.id}
              b={b}
              onToggle={() => void setActive(b.id, !b.is_active)}
              onDelete={async () => {
                const ok = await confirm({ title: t('adm.badges.delete'), message: t('adm.badges.deleteConfirm') });
                if (ok) void remove(b);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
