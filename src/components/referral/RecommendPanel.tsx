/**
 * RecommendPanel — "Recomienda Neuromundi". Disponible para todos los perfiles.
 * Muestra el enlace de recomendación personal (con el folio del usuario), permite
 * compartirlo (menú nativo, copiar o botones directos) y cuántas personas ha
 * recomendado. Los registros que lleguen por su enlace se atribuyen a su folio.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share2, Copy, Check, Users, MessageCircle, Mail, Facebook, Linkedin, Gift, Percent, Clock } from 'lucide-react';
import { Button, useToast, HowTo } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { useReferralSummary } from '@/hooks/useReferralProgram';
import { referralUrl, formatMemberNo } from '@/lib/referral';
import { track } from '@/lib/track';

export function RecommendPanel() {
  const { t } = useTranslation();
  const toast = useToast();
  const profile = useAuthStore((s) => s.profile);
  const { summary } = useReferralSummary();
  const [copied, setCopied] = useState(false);

  if (!profile) return null;

  if (profile.member_no == null) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        {t('recommend.noCode')}
      </div>
    );
  }

  const code = formatMemberNo(profile.member_no);
  const url = referralUrl(profile.member_no);
  const message = t('recommend.shareMessage');
  const full = `${message} ${url}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      track('referral_share', { channel: 'copy' });
    } catch {
      toast.error(t('recommend.copyFail'));
    }
  };

  const nativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: t('recommend.shareTitle'), text: message, url });
        track('referral_share', { channel: 'native' });
      } catch {
        /* cancelado */
      }
    } else {
      void copy();
    }
  };

  const openShare = (channel: string, href: string) => {
    track('referral_share', { channel });
    // mailto: abrir en la misma pestaña (window.open deja una pestaña vacía).
    if (href.startsWith('mailto:')) { window.location.href = href; return; }
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  const enc = encodeURIComponent;
  const channels = [
    { key: 'whatsapp', icon: MessageCircle, cls: 'bg-[#25D366]', href: `https://wa.me/?text=${enc(full)}` },
    { key: 'email', icon: Mail, cls: 'bg-slate-600', href: `mailto:?subject=${enc(t('recommend.shareTitle'))}&body=${enc(full)}` },
    { key: 'facebook', icon: Facebook, cls: 'bg-[#1877F2]', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}&quote=${enc(full)}` },
    { key: 'x', icon: Share2, cls: 'bg-slate-900', href: `https://twitter.com/intent/tweet?text=${enc(message)}&url=${enc(url)}` },
    { key: 'linkedin', icon: Linkedin, cls: 'bg-[#0A66C2]', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
  ];

  return (
    <div className="space-y-4">
      <HowTo stepsKey="howto.recommend" />

      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-700 p-6 text-white shadow-lg">
        <Gift className="h-9 w-9 opacity-90" aria-hidden="true" />
        <h2 className="mt-2 text-2xl font-extrabold">{t('recommend.title')}</h2>
        <p className="mt-1 max-w-xl text-sm text-white/90">{t('recommend.subtitle')}</p>
      </section>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-3">
          <Users className="h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
          <p className="text-sm text-brand-800">
            {t('recommend.count', { count: summary?.total_uses ?? 0 })}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-sage-200 bg-sage-50 p-3">
          <Percent className="h-5 w-5 shrink-0 text-sage-700" aria-hidden="true" />
          <p className="text-sm text-sage-800">
            {t('recommend.accrued', {
              pct: summary?.accrued_pct ?? 0,
              max: summary?.max_pct ?? 0,
            })}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-2xl border border-warm-200 bg-warm-50 p-3 text-sm text-warm-800">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>{t('recommend.rules', { days: summary?.validity_days ?? 7, step: summary?.step_pct ?? 5 })}</p>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{t('recommend.yourCode')}</p>
        <p className="mb-3 font-mono text-lg font-bold tracking-wide text-slate-900">{code}</p>

        <label htmlFor="ref-url" className="mb-1 block text-xs font-semibold text-slate-700">{t('recommend.yourLink')}</label>
        <div className="flex gap-2">
          <input
            id="ref-url"
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
          <Button variant="secondary" onClick={copy} leadingIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}>
            {copied ? t('recommend.copied') : t('recommend.copy')}
          </Button>
        </div>

        <Button fullWidth className="mt-3" onClick={nativeShare} leadingIcon={<Share2 className="h-4 w-4" />}>
          {t('recommend.share')}
        </Button>

        <div className="mt-3 flex flex-wrap justify-center gap-3">
          {channels.map(({ key, icon: Icon, cls, href }) => (
            <button
              key={key}
              type="button"
              aria-label={t(`recommend.channel.${key}`)}
              title={t(`recommend.channel.${key}`)}
              onClick={() => openShare(key, href)}
              className={`flex h-11 w-11 items-center justify-center rounded-full text-white transition-transform hover:scale-110 ${cls}`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
