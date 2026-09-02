/**
 * AdminDashboard — panel de moderación.
 *
 * El admin revisa proveedores y controla su verificación y publicación en el
 * directorio. Filtros: pendientes (sin verificar o sin publicar), verificados y
 * todos. Acciones con confirmación visual inmediata (optimistas) y toasts.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, ShieldOff, Eye, EyeOff, ExternalLink, RefreshCw, FileText, Sparkles } from 'lucide-react';
import { Button, Tabs, SkeletonCard, useToast , Avatar, DistintivoBadge} from '@/components/ui';
import { useAdmin, type AdminFilter } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { ProductManager } from '@/components/merchant/ProductManager';
import { AdminProducts } from './AdminProducts';
import { AdminOtherValues } from './AdminOtherValues';
import { AdminRenewals } from './AdminRenewals';
import { AdminReports } from './AdminReports';
import { AdminMetrics } from './AdminMetrics';
import { AdminMessages } from './AdminMessages';
import { AdminReferrals } from './AdminReferrals';
import { AdminFees } from './AdminFees';
import { AdminDonations } from './AdminDonations';
import { AdminFounders } from './AdminFounders';
import { AdminMemberBadges } from './AdminMemberBadges';
import { AdminTribe } from './AdminTribe';
import { AdminAccountActions } from './AdminAccountActions';
import { AdminImprovements } from './AdminImprovements';
import { AdminAdvisors } from './AdminAdvisors';
import { AdminCampaign } from './AdminCampaign';
import { formatDate, cn } from '@/lib/utils';
import type { Profile } from '@/types/app';
import { useAdminBadges } from '@/hooks/useAdminBadges';
import { supabase } from '@/lib/supabase';
import type { BadgeResult } from '@/lib/badge';

const TYPE_LABEL_KEY: Record<string, string> = {
  service_provider: 'admin.typeService',
  merchant: 'admin.typeMerchant',
};

function ProviderRow({
  provider,
  onVerify,
  onPublish,
  onNeuro,
  badge,
}: {
  provider: Profile;
  onVerify: (id: string, value: boolean) => void;
  onPublish: (id: string, value: boolean) => void;
  onNeuro: (id: string, value: boolean) => void;
  badge?: BadgeResult | null;
}) {
  const { t } = useTranslation();
  const name = provider.business_name ?? provider.full_name;
  const pd = (provider.provider_details ?? {}) as { verification_docs?: unknown };
  const docs = Array.isArray(pd.verification_docs) ? (pd.verification_docs as string[]) : [];
  const openDoc = async (path: string) => {
    const { data } = await supabase.storage.from('verification').createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener');
  };
  return (
    <li className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar name={name} src={provider.avatar_url} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{name}</p>
          <p className="text-sm text-muted">
            {provider.provider_type ? t(TYPE_LABEL_KEY[provider.provider_type]) : t('admin.noType')}
            {provider.city ? ` · ${provider.city}` : ''} · {formatDate(provider.created_at)}
          </p>
          <div className="mt-1 flex flex-wrap gap-2 text-xs">
            <span className={provider.is_verified ? 'text-sage-700' : 'text-muted'}>
              {provider.is_verified ? t('admin.verified') : t('admin.unverified')}
            </span>
            <span aria-hidden="true">·</span>
            <span className={provider.is_published ? 'text-brand-700' : 'text-muted'}>
              {provider.is_published ? t('admin.published') : t('admin.unpublished')}
            </span>
            {provider.neuroaffirming && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-violet-700">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> {t('admin.neuroOn')}
                </span>
              </>
            )}
          </div>
          {provider.cedula_profesional ? (
            <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-700">
              <FileText className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
              {t('admin.credential')}: <span className="font-semibold">{provider.cedula_profesional}</span>
              {provider.country ? <span className="text-muted">· {provider.country}</span> : null}
            </p>
          ) : (
            <p className="mt-1 text-xs text-warm-700">{t('admin.noCredential')}</p>
          )}
          {docs.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-2">
              {docs.map((d, i) => (
                <button key={i} type="button" onClick={() => openDoc(d)} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" /> {t('admin.viewDoc', { n: i + 1 })}
                </button>
              ))}
            </div>
          )}
          {badge && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <DistintivoBadge badge={badge} size="sm" showReview />
              <span className="text-xs text-muted">
                {badge.level ? t(`badge.${badge.level}`) : t('admin.badgeNone')} · {t('admin.badgeScore', { score: badge.score })}
                {` · ${badge.breakdown.qualityHuman}/50 · ${badge.breakdown.economic}/30 · ${badge.breakdown.commitment}/20`}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={provider.is_verified ? 'ghost' : 'primary'}
          onClick={() => onVerify(provider.id, !provider.is_verified)}
          leadingIcon={provider.is_verified ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
        >
          {provider.is_verified ? t('admin.unverify') : t('admin.verify')}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onPublish(provider.id, !provider.is_published)}
          leadingIcon={provider.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        >
          {provider.is_published ? t('admin.unpublish') : t('admin.publish')}
        </Button>
        <Button
          size="sm"
          variant={provider.neuroaffirming ? 'ghost' : 'secondary'}
          onClick={() => onNeuro(provider.id, !provider.neuroaffirming)}
          leadingIcon={<Sparkles className="h-4 w-4" />}
        >
          {provider.neuroaffirming ? t('admin.neuroRevoke') : t('admin.neuroGrant')}
        </Button>
        {provider.website_url && (
          <a
            href={provider.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 text-sm font-semibold text-brand-700"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" /> {t('admin.site')}
          </a>
        )}
      </div>
    </li>
  );
}

function ProviderList({ filter }: { filter: AdminFilter }) {
  const { providers, loading, setVerified, setPublished, setNeuroaffirming } = useAdmin(filter);
  const badges = useAdminBadges();
  const toast = useToast();
  const { t } = useTranslation();

  const onVerify = async (id: string, value: boolean) => {
    const res = await setVerified(id, value);
    if (!res.ok) toast.error(res.error);
  };
  const onPublish = async (id: string, value: boolean) => {
    const res = await setPublished(id, value);
    if (!res.ok) toast.error(res.error);
  };
  const onNeuro = async (id: string, value: boolean) => {
    const res = await setNeuroaffirming(id, value);
    if (!res.ok) toast.error(res.error);
  };

  if (loading) return <div className="space-y-3"><SkeletonCard rows={0} /><SkeletonCard rows={0} /></div>;
  if (providers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-muted">
        {t('admin.empty')}
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {providers.map((p) => (
        <ProviderRow key={p.id} provider={p} onVerify={onVerify} onPublish={onPublish} onNeuro={onNeuro} badge={badges.get(p.id) ?? null} />
      ))}
    </ul>
  );
}

type AdminSection = 'metrics' | 'messages' | 'moderation' | 'products' | 'store' | 'renewals' | 'referrals' | 'fees' | 'donations' | 'founders' | 'badges' | 'tribe' | 'accounts' | 'advisors' | 'campaign' | 'improve' | 'reports' | 'other';

// Secciones que puede ver un ASESOR (explorador + moderador de Tribu): SOLO la
// moderación de Tribu. Las demás (incluidas métricas) son de administrador.
const ADVISOR_SECTIONS: AdminSection[] = ['tribe'];
const ALL_SECTIONS: AdminSection[] = ['metrics', 'messages', 'moderation', 'products', 'store', 'renewals', 'referrals', 'fees', 'donations', 'founders', 'badges', 'tribe', 'accounts', 'advisors', 'campaign', 'improve', 'reports', 'other'];

export function AdminDashboard({ advisor = false }: { advisor?: boolean } = {}) {
  const { t } = useTranslation();
  const toast = useToast();
  const { userId } = useAuth();
  const [tab, setTab] = useState<AdminFilter>('pending');
  const sections = advisor ? ADVISOR_SECTIONS : ALL_SECTIONS;
  const [section, setSection] = useState<AdminSection>(advisor ? 'tribe' : 'metrics');
  const [recalcBusy, setRecalcBusy] = useState(false);

  const recalcBadges = async () => {
    setRecalcBusy(true);
    const { data, error } = await supabase.rpc('refresh_all_badges');
    setRecalcBusy(false);
    if (error) toast.error(error.message);
    else toast.success(t('admin.recalcDone', { count: data ?? 0 }));
  };

  return (
    <div className="mx-auto w-full max-w-2xl p-4">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">{t('admin.title')}</h1>

      <div className="mb-4 inline-flex flex-wrap rounded-xl bg-slate-100 p-1">
        {sections.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSection(s)}
            className={cn(
              'rounded-lg px-4 py-1.5 text-sm font-semibold',
              section === s ? 'bg-white text-slate-900 shadow-sm' : 'text-muted',
            )}
          >
            {t(s === 'metrics' ? 'admin.secMetrics' : s === 'messages' ? 'admin.secMessages' : s === 'moderation' ? 'admin.secModeration' : s === 'products' ? 'admin.secProducts' : s === 'store' ? 'admin.secStore' : s === 'renewals' ? 'admin.secRenewals' : s === 'referrals' ? 'admin.secReferrals' : s === 'fees' ? 'admin.secFees' : s === 'donations' ? 'admin.secDonations' : s === 'founders' ? 'admin.secFounders' : s === 'badges' ? 'admin.secBadges' : s === 'tribe' ? 'admin.secTribe' : s === 'accounts' ? 'admin.secAccounts' : s === 'advisors' ? 'admin.secAdvisors' : s === 'campaign' ? 'admin.secCampaign' : s === 'improve' ? 'admin.secImprove' : s === 'reports' ? 'admin.secReports' : 'admin.secOther')}
          </button>
        ))}
      </div>

      {section === 'metrics' ? (
        <AdminMetrics />
      ) : section === 'messages' ? (
        <AdminMessages />
      ) : section === 'moderation' ? (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" loading={recalcBusy} onClick={recalcBadges} leadingIcon={<RefreshCw className="h-4 w-4" />}>
              {t('admin.recalcBadges')}
            </Button>
          </div>
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as AdminFilter)}
            tabs={[
              { id: 'pending', label: t('admin.tabPending'), content: <ProviderList filter="pending" /> },
              { id: 'verified', label: t('admin.tabVerified'), content: <ProviderList filter="verified" /> },
              { id: 'all', label: t('admin.tabAll'), content: <ProviderList filter="all" /> },
            ]}
          />
        </div>
      ) : section === 'products' ? (
        <AdminProducts />
      ) : section === 'store' ? (
        <div className="space-y-3">
          <p className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
            {t('admin.corporateStoreHint')}
          </p>
          {userId ? <ProductManager vendorId={userId} /> : <SkeletonCard rows={2} />}
        </div>
      ) : section === 'renewals' ? (
        <AdminRenewals />
      ) : section === 'referrals' ? (
        <AdminReferrals />
      ) : section === 'fees' ? (
        <AdminFees />
      ) : section === 'donations' ? (
        <AdminDonations />
      ) : section === 'founders' ? (
        <AdminFounders />
      ) : section === 'badges' ? (
        <AdminMemberBadges />
      ) : section === 'tribe' ? (
        <AdminTribe />
      ) : section === 'accounts' ? (
        <AdminAccountActions />
      ) : section === 'advisors' ? (
        <AdminAdvisors />
      ) : section === 'campaign' ? (
        <AdminCampaign />
      ) : section === 'improve' ? (
        <AdminImprovements />
      ) : section === 'reports' ? (
        <AdminReports />
      ) : (
        <AdminOtherValues />
      )}
    </div>
  );
}
