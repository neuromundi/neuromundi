/**
 * ProfileCompletion — asistente que aparece en el panel del proveedor cuando aún
 * no tiene foto/logotipo. Resuelve las subidas que se difieren en el registro
 * (durante el registro puede no haber sesión). Usa uploadAvatar (Storage con
 * sesión). Descartable por sesión; enlaza a Ajustes para documentos.
 */
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Camera, X, CheckCircle2, Upload, FileCheck2, FileText } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const DISMISS_KEY = 'neuromundi.profileCompletionDismissed';

export function ProfileCompletion() {
  const { t } = useTranslation();
  const toast = useToast();
  const { isProvider, userId } = useAuth();
  const { profile, uploadAvatar, updateProfile, saving } = useProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) != null; } catch { return false; }
  });

  // Solo proveedores sin avatar/logo y sin descartar en esta sesión.
  if (!isProvider || !profile || profile.avatar_url || dismissed) return null;

  const details = (profile.provider_details ?? {}) as Record<string, unknown>;
  const docs = Array.isArray(details.verification_docs) ? (details.verification_docs as string[]) : [];

  const pick = () => fileRef.current?.click();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = await uploadAvatar(f);
    if (r.ok) toast.success(t('complete.uploaded'));
    else toast.error(r.error);
  };

  const pickDoc = () => docRef.current?.click();
  const onDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !userId) return;
    setUploadingDoc(true);
    try {
      const safe = f.name.replace(/[^\w.\-]/g, '_');
      const path = `${userId}/${Date.now()}-${safe}`;
      const up = await supabase.storage.from('verification').upload(path, f, { contentType: f.type || 'application/octet-stream' });
      if (up.error) throw up.error;
      const next = [...docs, safe];
      const res = await updateProfile({ provider_details: { ...details, verification_docs: next } as never });
      if (!res.ok) throw new Error(res.error);
      toast.success(t('complete.docUploaded'));
    } catch (err) {
      toast.error(t('complete.docError'));
    } finally {
      setUploadingDoc(false);
    }
  };

  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-5 shadow-sm">
      <button onClick={dismiss} aria-label={t('common.close')} className="absolute right-3 top-3 rounded-lg p-1.5 text-muted hover:bg-white">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          <Camera className="h-6 w-6" />
        </span>
        <div className="flex-1">
          <h3 className="font-bold text-slate-900">{t('complete.title')}</h3>
          <p className="mt-1 text-sm text-muted">{t('complete.body')}</p>
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-evs-5" /> {t('complete.step1')}</li>
            <li className="flex items-center gap-2">
              {docs.length > 0 ? <FileCheck2 className="h-4 w-4 text-evs-5" /> : <CheckCircle2 className="h-4 w-4 text-slate-300" />}
              {t('complete.step2')}{docs.length > 0 ? ` (${docs.length})` : ''}
            </li>
          </ul>
          {docs.length > 0 && (
            <ul className="mt-2 space-y-1">
              {docs.map((d) => (
                <li key={d} className="flex items-center gap-1.5 text-xs text-muted"><FileText className="h-3.5 w-3.5" /> {d}</li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            <input ref={docRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onDoc} />
            <Button onClick={pick} loading={saving} leadingIcon={<Upload className="h-4 w-4" />}>{t('complete.upload')}</Button>
            <Button variant="secondary" onClick={pickDoc} loading={uploadingDoc} leadingIcon={<FileCheck2 className="h-4 w-4" />}>{t('complete.uploadDoc')}</Button>
            <Link to="/ajustes" className="text-sm font-semibold text-brand-700 hover:underline">{t('complete.goSettings')}</Link>
          </div>
          <p className="mt-2 text-xs text-muted">{t('complete.docNote')}</p>
        </div>
      </div>
    </div>
  );
}
