/**
 * NeuromundiIdCard — la "Neuromundi ID": tarjeta digital de identidad de la
 * comunidad. Anverso (identidad: logo, nombre, rol comunitario, folio, QR,
 * vigencia) y reverso (operativo: enlace al directorio + instrucciones de escaneo).
 * Color de borde por rol (pertenencia/exclusividad). Nomenclatura comunitaria
 * (Miembro / Familia / Especialista Neuromundi), nunca "usuario" o "cliente".
 *
 * Para consumidores (paciente/familia) el QR es el de descuentos; para
 * especialistas enlaza a su perfil público. La versión para Apple/Google Wallet
 * (.pkpass) llegará en una fase posterior (requiere certificados).
 */
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, RefreshCw, RotateCw, ShieldCheck, Globe, ScanLine } from 'lucide-react';
import { Button, Modal, useToast } from '@/components/ui';
import { useProfile } from '@/hooks/useProfile';
import { useWalletPass } from '@/hooks/useWalletPass';
import { formatMemberNo } from '@/lib/referral';
import type { ParentQrPayload, Profile } from '@/types/app';
import { cn } from '@/lib/utils';

type RoleKey = 'family' | 'member' | 'specialist';

function roleKeyFor(p: Profile): RoleKey {
  if (p.role === 'provider') return 'specialist';
  if (p.role === 'parent') return 'family';
  return 'member';
}

const ROLE_STYLE: Record<RoleKey, { border: string; head: string; dot: string }> = {
  family: { border: 'border-sky-400', head: 'from-sky-500 to-brand-600', dot: 'bg-sky-400' },
  member: { border: 'border-emerald-400', head: 'from-emerald-500 to-teal-600', dot: 'bg-emerald-400' },
  specialist: { border: 'border-violet-400', head: 'from-violet-600 to-indigo-600', dot: 'bg-violet-400' },
};

export function NeuromundiIdCard({ profile }: { profile: Profile }) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { regenerateQrToken, saving } = useProfile();
  const { add: addToWallet, busy: walletBusy, enabled: walletEnabled } = useWalletPass();
  const qrRef = useRef<HTMLDivElement>(null);
  const [back, setBack] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);

  const roleKey = roleKeyFor(profile);
  const style = ROLE_STYLE[roleKey];
  const isConsumer = profile.role === 'parent' || profile.role === 'patient';
  const displayName = profile.business_name?.trim() || profile.full_name || t('nid.member');
  const folio = profile.member_no != null ? formatMemberNo(profile.member_no) : '—';
  const issued = profile.created_at ? new Date(profile.created_at).toLocaleDateString(i18n.language, { year: 'numeric', month: 'short' }) : '';

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.neuromundi.com';
  const qrValue = isConsumer
    ? JSON.stringify({ parentId: profile.id, qrToken: profile.qr_token } as ParentQrPayload)
    : `${origin}/proveedor/${profile.id}`;

  const downloadQr = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) { toast.error(t('qr.downloadError')); return; }
    const a = document.createElement('a');
    a.download = 'neuromundi-id.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  };

  const rotate = async () => {
    const res = await regenerateQrToken();
    setConfirmRotate(false);
    toast[res.ok ? 'success' : 'error'](res.ok ? t('qr.regenerated') : res.error);
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className={cn('overflow-hidden rounded-3xl border-2 bg-white shadow-lg', style.border)}>
        {/* Cabecera con identidad visual */}
        <div className={cn('flex items-center justify-between bg-gradient-to-r px-5 py-3 text-white', style.head)}>
          <span className="text-sm font-extrabold uppercase tracking-widest">Neuromundi ID</span>
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </div>

        {!back ? (
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t(`nid.role.${roleKey}`)}</p>
                <p className="mt-0.5 truncate text-xl font-bold text-slate-900">{displayName}</p>
                <p className="mt-1 font-mono text-sm text-brand-700">{folio}</p>
                {issued && <p className="mt-2 text-xs text-muted">{t('nid.issued')}: {issued}</p>}
                <p className="mt-0.5 text-xs text-muted">{t('nid.valid')}</p>
              </div>
              <div ref={qrRef} className="shrink-0 rounded-xl border border-slate-100 bg-white p-2">
                <QRCodeCanvas value={qrValue} size={104} level="M" includeMargin aria-label={t('qr.imgAria')} role="img" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-5 text-sm text-slate-700">
            <a href={`${origin}/directorio`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline">
              <Globe className="h-4 w-4" /> {t('nid.directory')}
            </a>
            <div>
              <p className="mb-1 flex items-center gap-1.5 font-semibold text-slate-900"><ScanLine className="h-4 w-4 text-brand-600" /> {t('nid.howToTitle')}</p>
              <ol className="list-decimal space-y-0.5 pl-5 text-slate-600">
                <li>{t('nid.how1')}</li>
                <li>{t('nid.how2')}</li>
                <li>{t('nid.how3')}</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="ghost" leadingIcon={<RotateCw className="h-4 w-4" />} onClick={() => setBack((b) => !b)}>
          {back ? t('nid.showFront') : t('nid.showBack')}
        </Button>
        <Button size="sm" variant="secondary" leadingIcon={<Download className="h-4 w-4" />} onClick={downloadQr}>{t('nid.downloadQr')}</Button>
        {isConsumer && (
          <Button size="sm" variant="ghost" leadingIcon={<RefreshCw className="h-4 w-4" />} onClick={() => setConfirmRotate(true)}>{t('qr.regenerate')}</Button>
        )}
      </div>

      {/* Añadir a Wallet: solo cuando el backend está configurado (Fase 3). */}
      {walletEnabled ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" loading={walletBusy === 'apple'} onClick={async () => { const r = await addToWallet('apple'); if (!r.ok) toast.error(t('nid.walletErr')); }}>{t('nid.addApple')}</Button>
          <Button size="sm" variant="ghost" loading={walletBusy === 'google'} onClick={async () => { const r = await addToWallet('google'); if (!r.ok) toast.error(t('nid.walletErr')); }}>{t('nid.addGoogle')}</Button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted">{t('nid.walletSoon')}</p>
      )}

      <Modal
        open={confirmRotate}
        onClose={() => setConfirmRotate(false)}
        title={t('qr.confirmTitle')}
        description={t('qr.confirmDesc')}
        footer={<>
          <Button variant="ghost" onClick={() => setConfirmRotate(false)}>{t('common.betterNot')}</Button>
          <Button variant="primary" onClick={rotate} loading={saving}>{t('qr.confirmYes')}</Button>
        </>}
      >
        <p className="text-sm text-slate-700">{t('qr.confirmBody')}</p>
      </Modal>
    </div>
  );
}
