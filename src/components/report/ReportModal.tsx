/**
 * ReportModal — "Denuncia". Abierta a miembros y a personas externas.
 *
 * Paso 1: elige si es miembro o no.
 *   · Miembro sin sesión → inicia sesión aquí mismo y sigue a la denuncia.
 *   · Miembro con sesión → denuncia directa (datos tomados de su perfil).
 *   · No miembro → denuncia con correo de contacto OBLIGATORIO y nombre opcional.
 * Toda denuncia es anónima frente al denunciado. Ambos casos muestran el mismo
 * mensaje de confirmación. Adjuntos: imágenes, videos y documentos.
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, ShieldAlert, Paperclip, Trash2, Check, UserCheck, UserX, EyeOff } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { useReports, REPORT_CATEGORIES, type ReportCategory } from '@/hooks/useReports';
import { formatMemberNo } from '@/lib/referral';
import { isStrictEmail } from '@/lib/email';

const inputCls = 'w-full rounded-xl border border-slate-200 p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
const labelCls = 'mb-1 block text-sm font-semibold text-slate-900';

type Mode = null | 'member' | 'nonmember';

export function ReportModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { userId } = useAuth();
  const profile = useAuthStore((s) => s.profile);
  const { submitReport, submitting } = useReports();

  const [mode, setMode] = useState<Mode>(null);
  const [contactEmail, setContactEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [reportedNo, setReportedNo] = useState('');
  const [category, setCategory] = useState<ReportCategory>('service_breach');
  const [categoryOther, setCategoryOther] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, 10));
  };
  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const isMember = mode === 'member';

  const submit = async () => {
    setError(null);
    if (!isMember && !isStrictEmail(contactEmail)) { setError(t('report.errEmail')); return; }
    if (description.trim().length < 10) { setError(t('report.errDescription')); return; }
    if (category === 'other' && !categoryOther.trim()) { setError(t('report.errOther')); return; }
    const res = await submitReport({
      isMember,
      reporterEmail: contactEmail,
      reporterName: contactName,
      reportedMemberNo: reportedNo.replace(/\D+/g, '') ? Number(reportedNo.replace(/\D+/g, '')) : null,
      category,
      categoryOther,
      description,
      files,
    });
    if (res.ok) setDone(true);
    else toast.error(res.error);
  };

  const Header = (
    <div className="bg-gradient-to-br from-red-600 to-rose-700 px-6 py-5 text-white">
      <ShieldAlert className="h-8 w-8 opacity-90" aria-hidden="true" />
      <h2 id="report-title" className="mt-2 text-xl font-extrabold">{t('report.title')}</h2>
    </div>
  );

  const Anon = (
    <p className="flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
      <EyeOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {t('report.anonymous')}
    </p>
  );

  const Form = (
    <>
      {Anon}
      {!isMember ? (
        <>
          <div>
            <label htmlFor="rep-email" className={labelCls}>{t('report.contactEmail')}</label>
            <input id="rep-email" type="email" className={inputCls} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="tu@correo.com" />
            <p className="mt-1 text-xs text-muted">{t('report.contactEmailHint')}</p>
          </div>
          <div>
            <label htmlFor="rep-name" className={labelCls}>{t('report.contactName')}</label>
            <input id="rep-name" className={inputCls} value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder={t('report.optional')} />
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-slate-100 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t('report.reporter')}</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {profile?.business_name || profile?.full_name || '—'}
            {profile?.member_no != null && <span className="ml-2 font-mono text-xs text-muted">{formatMemberNo(profile.member_no)}</span>}
          </p>
        </div>
      )}

      <div>
        <label htmlFor="rep-no" className={labelCls}>{t('report.reportedNo')}</label>
        <input id="rep-no" className={inputCls} placeholder="NM-000123" value={reportedNo} onChange={(e) => setReportedNo(e.target.value)} />
        <p className="mt-1 text-xs text-muted">{t('report.reportedHint')}</p>
      </div>

      <div>
        <label htmlFor="rep-cat" className={labelCls}>{t('report.category')}</label>
        <select id="rep-cat" className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as ReportCategory)}>
          {REPORT_CATEGORIES.map((c) => (<option key={c} value={c}>{t(`report.cat.${c}`)}</option>))}
        </select>
      </div>

      {category === 'other' && (
        <div>
          <label htmlFor="rep-cat-other" className={labelCls}>{t('report.categoryOther')}</label>
          <input id="rep-cat-other" className={inputCls} value={categoryOther} onChange={(e) => setCategoryOther(e.target.value)} />
        </div>
      )}

      <div>
        <label htmlFor="rep-desc" className={labelCls}>{t('report.description')}</label>
        <textarea id="rep-desc" rows={5} className={inputCls} placeholder={t('report.descriptionPlaceholder')} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div>
        <label className={labelCls}>{t('report.attachments')}</label>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-600 hover:bg-slate-50">
          <Paperclip className="h-4 w-4" aria-hidden="true" /> {t('report.attachAction')}
          <input type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.txt" className="hidden" onChange={(e) => addFiles(e.target.files)} />
        </label>
        <p className="mt-1 text-xs text-muted">{t('report.attachHint')}</p>
        {files.length > 0 && (
          <ul className="mt-2 space-y-1">
            {files.map((f, i) => (
              <li key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-700">
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <button type="button" onClick={() => removeFile(i)} aria-label={t('common.delete')} className="text-evs-1 hover:opacity-80">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-evs-1">{error}</p>}

      <Button fullWidth loading={submitting} onClick={submit} leadingIcon={<ShieldAlert className="h-4 w-4" />}>
        {t('report.submit')}
      </Button>
    </>
  );

  const body = (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true" aria-labelledby="report-title">
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <button type="button" onClick={onClose} aria-label={t('common.close')} className="absolute right-3 top-3 z-10 rounded-full p-1 text-white/90 hover:bg-white/20">
          <X className="h-5 w-5" />
        </button>
        {Header}

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <p className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
            {t('report.intro')}
          </p>

          {done ? (
            <div className="rounded-2xl border border-sage-200 bg-sage-50 p-4 text-center">
              <Check className="mx-auto h-8 w-8 text-sage-600" aria-hidden="true" />
              <p className="mt-2 font-bold text-sage-800">{t('report.sentTitle')}</p>
              <p className="mt-1 text-sm text-sage-700">{t('report.sentBody')}</p>
              <Button className="mt-4" onClick={onClose}>{t('common.close')}</Button>
            </div>
          ) : mode === null ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-900">{t('report.whoAsk')}</p>
              <button type="button" onClick={() => setMode('member')} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-4 text-left hover:border-brand-300 hover:bg-brand-50">
                <UserCheck className="h-6 w-6 shrink-0 text-brand-600" aria-hidden="true" />
                <span><span className="block font-semibold text-slate-900">{t('report.iAmMember')}</span><span className="text-sm text-muted">{t('report.iAmMemberHint')}</span></span>
              </button>
              <button type="button" onClick={() => setMode('nonmember')} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-4 text-left hover:border-brand-300 hover:bg-brand-50">
                <UserX className="h-6 w-6 shrink-0 text-slate-500" aria-hidden="true" />
                <span><span className="block font-semibold text-slate-900">{t('report.notMember')}</span><span className="text-sm text-muted">{t('report.notMemberHint')}</span></span>
              </button>
            </div>
          ) : mode === 'member' && !userId ? (
            <div className="space-y-3">
              <p className="rounded-xl bg-brand-50 p-3 text-sm text-brand-800">{t('report.loginToReport')}</p>
              <LoginForm />
            </div>
          ) : (
            Form
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(body, document.body);
}
