/**
 * ProviderProfile — perfil público de un proveedor (internacionalizado).
 */
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { ArrowLeft, MapPin, ShieldCheck, Tag, Users, Sparkles, Waves, LifeBuoy, Heart, Star, BadgeCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCatLabel } from '@/lib/catLabel';
import { Button, EVSBadge, SkeletonCard, DistintivoBadge, FounderBadge } from '@/components/ui';
import { ConnectButton, SaveToListButton } from '@/components/directory';
import { BookAppointment } from '@/components/booking/BookAppointment';
import { useProviderProfile } from '@/hooks/useProviderProfile';
import { useProviderBadge } from '@/hooks/useProviderBadge';
import { useFounderStatus } from '@/hooks/useFounder';
import { useProviderRatings } from '@/hooks/useProviderRatings';
import { useOffers } from '@/hooks/useOffers';
import { useAuth } from '@/hooks/useAuth';
import { DonateCallout } from '@/components/donation/DonateCallout';
import { ProviderReviews } from '@/components/directory/ProviderReviews';
import { ProviderReviewModal } from '@/components/directory/ProviderReviewModal';
import { SchoolInclusionInfo } from '@/components/directory/SchoolInclusionInfo';
import { EsparcimientoInfo } from '@/components/directory/EsparcimientoInfo';
import { useProviderReview } from '@/hooks/useProviderReview';
import { trackProfileEvent } from '@/hooks/useProviderMetrics';
import { discountLabel } from '@/lib/utils';
import { DIMENSION_LABEL_KEY } from '@/types/app';

export function ProviderProfile() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const catLabel = useCatLabel();
  const { isProvider, isParent, isConsumer, userId } = useAuth();
  const { profile, categories, network, loading } = useProviderProfile(id);
  const { badge } = useProviderBadge(id);
  const { isFounder } = useFounderStatus(id);
  const { rating, radar } = useProviderRatings(id, profile?.provider_type ?? null);
  const { canReview } = useProviderReview(isConsumer || isParent ? id : null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const { offers } = useOffers(id);
  const activeOffers = offers.filter((o) => o.status === 'active');

  // Métrica de perfil: cuenta una VISTA al abrir el perfil de otro (la base
  // ignora la autovisita del propio prestador). Best-effort, no bloquea.
  const viewedRef = useRef(false);
  useEffect(() => {
    if (!id || viewedRef.current) return;
    viewedRef.current = true;
    void trackProfileEvent(id, 'view');
  }, [id]);

  // Cuenta el contacto una sola vez por carga de perfil.
  const contactedRef = useRef(false);
  const trackContactOnce = (providerId: string) => {
    if (contactedRef.current) return;
    contactedRef.current = true;
    void trackProfileEvent(providerId, 'contact');
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <SkeletonCard rows={3} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center text-muted">
        <p>{t('profile.notFound')}</p>
        <Button variant="ghost" onClick={() => navigate('/directorio')} className="mt-4">
          {t('profile.back')}
        </Button>
      </div>
    );
  }

  const name = profile.business_name ?? profile.full_name;
  const radarData = radar.map((d) => ({ label: t(DIMENSION_LABEL_KEY[d.key]), value: d.value }));

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/directorio')} leadingIcon={<ArrowLeft className="h-4 w-4" />}>
        {t('nav.directory')}
      </Button>

      <header className="flex items-start gap-4">
        {profile.avatar_url ? (
          <img loading="lazy" decoding="async" src={profile.avatar_url} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <Tag className="h-7 w-7" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">{name}</h1>
            {profile.is_verified && <ShieldCheck className="h-5 w-5 text-brand-500" aria-label={t('card.verified')} />}
            <FounderBadge isFounder={isFounder} size="sm" />
            {profile.neuroaffirming && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700"
                title={t('neuro.sealHint')}
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> {t('neuro.seal')}
              </span>
            )}
            {profile.accepts_neuromundi_id && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700" title={t('nid.acceptsHint')}>
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> {t('nid.accepts')}
              </span>
            )}
          </div>
          {profile.city && (
            <p className="flex items-center gap-1 text-sm text-muted">
              <MapPin className="h-4 w-4" aria-hidden="true" /> {profile.city}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <EVSBadge score={rating?.evs_score ?? null} totalReviews={rating?.total_reviews ?? 0} size="lg" />
            <DistintivoBadge badge={badge} size="md" showLabel showReview={userId === id} />
          </div>
        </div>
      </header>

      {(isParent || isConsumer || (isProvider && userId !== id)) && (
        // onClickCapture cuenta un CONTACTO al pulsar cualquier botón de esta
        // fila (conectar, reservar, guardar). Una vez por carga de perfil.
        <div className="flex flex-wrap gap-2" onClickCapture={() => trackContactOnce(id)}>
          {isProvider && userId !== id && <ConnectButton providerId={id} />}
          {isParent && <SaveToListButton providerId={id} />}
          {isConsumer && profile.provider_type === 'service_provider' && <BookAppointment providerId={id} />}
          {isConsumer && profile.provider_type === 'school' && <BookAppointment providerId={id} label={t('school.tour')} />}
          {(isConsumer || isParent) && userId !== id && canReview && (
            <Button variant="secondary" leadingIcon={<Star className="h-4 w-4" />} onClick={() => setReviewOpen(true)}>
              {t('review.button')}
            </Button>
          )}
        </div>
      )}

      {reviewOpen && (
        <ProviderReviewModal
          providerId={id}
          providerName={profile.business_name ?? profile.full_name ?? ''}
          providerType={profile.provider_type ?? null}
          onClose={() => setReviewOpen(false)}
        />
      )}

      {/* Gratitud contextual: a la familia que acaba de encontrar especialista. */}
      {(isParent || isConsumer) && <DonateCallout variant="directory" />}

      {profile.bio && <p className="text-slate-700">{profile.bio}</p>}

      {/* Programa de inclusión (escuelas y clínicas). */}
      {(profile.provider_type === 'school' || profile.provider_type === 'clinic') && (
        <SchoolInclusionInfo details={profile.provider_details as Record<string, unknown> | null} grades={profile.school_grades} />
      )}

      {/* Accesibilidad del lugar de esparcimiento. */}
      {profile.provider_type === 'tourism' && (
        <EsparcimientoInfo details={profile.provider_details as Record<string, unknown> | null} />
      )}

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <span key={c.id} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
              {catLabel(c.slug, c.name)}
            </span>
          ))}
        </div>
      )}

      {/* Perfil neuroafirmativo: las 3 dimensiones que definen el Sello. */}
      {rating && (rating.total_reviews ?? 0) > 0 && (
        <section className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
          <h2 className="mb-3 flex items-center gap-1.5 font-semibold text-violet-900">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> {t('neuro.profileTitle')}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {([
              { icon: Waves, key: 'neuro.sensory', v: rating.avg_sensory_adaptation },
              { icon: LifeBuoy, key: 'neuro.flexibility', v: rating.avg_flexibility_crisis },
              { icon: Heart, key: 'neuro.empathy', v: rating.avg_human_treatment },
            ] as const).map(({ icon: Icon, key, v }) => (
              <div key={key} className="flex items-center gap-2 rounded-xl bg-white p-3">
                <Icon className="h-5 w-5 shrink-0 text-violet-500" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-600">{t(key)}</p>
                  <p className="flex items-center gap-1 font-semibold text-slate-900">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                    {v != null ? Number(v).toFixed(1) : '—'}
                    <span className="text-xs font-normal text-muted">/5</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-violet-700/80">{t('neuro.profileNote')}</p>
        </section>
      )}

      {radarData.length >= 3 && (
        <section>
          <h2 className="mb-2 font-semibold text-slate-900">{t('profile.dimensions')}</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid />
                <PolarAngleAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                <Radar dataKey="value" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Reseñas de familias (públicas). */}
      <ProviderReviews providerId={id} providerName={name} />

      <section>
        <h2 className="mb-2 font-semibold text-slate-900">{t('profile.activeOffers')}</h2>
        {activeOffers.length === 0 ? (
          <p className="text-sm text-muted">{t('profile.noOffers')}</p>
        ) : (
          <ul className="space-y-2">
            {activeOffers.map((o) => (
              <li key={o.id} className="rounded-xl border border-slate-100 bg-white p-3">
                <p className="font-semibold text-slate-900">{o.title}</p>
                <p className="text-sm text-warm-700">{discountLabel(t, o.discount_type, o.discount_value)}</p>
                {o.description && <p className="mt-1 text-sm text-muted">{o.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
      {network.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
            <Users className="h-4 w-4 text-brand-500" aria-hidden="true" /> {t('network.section')}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {network.map((n) => (
              <li key={n.id}>
                <Link
                  to={`/proveedor/${n.id}`}
                  className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 hover:bg-slate-50"
                >
                  {n.avatar_url ? (
                    <img loading="lazy" decoding="async" src={n.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                      <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  )}
                  <span className="text-sm text-slate-700">{n.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
