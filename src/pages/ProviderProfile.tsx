/**
 * ProviderProfile — perfil público de un proveedor (internacionalizado).
 */
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { ArrowLeft, MapPin, ShieldCheck, Tag, Users, Sparkles, Waves, LifeBuoy, Heart, Star, BadgeCheck, Clock, Phone, Globe, Navigation, CalendarDays, UserCheck } from 'lucide-react';
import { safeHttpUrl } from '@/lib/safeUrl';
import { useTranslation } from 'react-i18next';
import { useCatLabel } from '@/lib/catLabel';
import { cn } from '@/lib/utils';
import { SECTION_BY_VALUE } from '@/data/sections';
import { badgeArt } from '@/data/badgeArt';
import { qualityBadge } from '@/lib/qualityBadge';
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
import { SectionsExplainer } from '@/components/common/SectionsExplainer';
import { ProviderReviews } from '@/components/directory/ProviderReviews';
import { ProviderReviewModal } from '@/components/directory/ProviderReviewModal';
import { SchoolInclusionInfo } from '@/components/directory/SchoolInclusionInfo';
import { EsparcimientoInfo } from '@/components/directory/EsparcimientoInfo';
import { useProviderReview } from '@/hooks/useProviderReview';
import { trackProfileEvent } from '@/hooks/useProviderMetrics';
import { discountLabel } from '@/lib/utils';
import { DIMENSION_LABEL_KEY } from '@/types/app';

// Mini-mapa de un pin: se carga aparte para no meter Leaflet en el bundle inicial.
const ProviderMiniMap = lazy(() =>
  import('@/components/directory/ProviderMiniMap').then((m) => ({ default: m.ProviderMiniMap })),
);

export function ProviderProfile() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
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
  // Una FICHA del directorio (sin cuenta) no admite reservar/conectar/reseñar:
  // esas acciones exigen un perfil real. La vista directorio_publico marca
  // origen='ficha' en esas filas.
  const isFicha = (profile as { origen?: string }).origen === 'ficha';

  // Estado "solo-nombre": SOLO cuando el titular reclamó/creó su perfil pero aún
  // no paga ('pending'). Ahí se revela únicamente nombre/razón social + ciudad +
  // secciones (incentivo de pago). Las fichas SIN reclamar ('exempt' en la vista)
  // NO se enmascaran: muestran sus datos públicos (contacto incluido) para dar
  // confianza; solo llevan una nota informativa de que se están completando.
  const locked = !['active', 'exempt', 'past_due'].includes((profile as { membership_status?: string }).membership_status ?? '');
  const website = profile.website || profile.website_url;

  // "Cómo llegar": deep-links de navegación cuando hay coordenadas. Si no hay
  // lat/lng pero sí dirección, se cae a una búsqueda por texto en Google Maps.
  const hasCoords = profile.latitude != null && profile.longitude != null;
  const mapsHref = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${profile.latitude},${profile.longitude}`
    : profile.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([profile.address, profile.city, profile.state].filter(Boolean).join(', '))}`
      : null;
  const wazeHref = hasCoords ? `https://waze.com/ul?ll=${profile.latitude},${profile.longitude}&navigate=yes` : null;

  if (locked) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/directorio')} leadingIcon={<ArrowLeft className="h-4 w-4" />}>
          {t('nav.directory')}
        </Button>
        <header className="flex items-start gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <Tag className="h-7 w-7" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-slate-900">{name}</h1>
            {(profile.city || profile.state) && (
              <p className="flex items-center gap-1 text-sm text-muted">
                <MapPin className="h-4 w-4" aria-hidden="true" /> {[profile.city, profile.state].filter(Boolean).join(', ')}
              </p>
            )}
            {(profile.sections ?? []).length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(profile.sections ?? []).map((sv) => {
                  const def = SECTION_BY_VALUE[sv];
                  if (!def) return null;
                  return (
                    <span key={sv} className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', def.chip)}>
                      {t(`sections.${sv}.name`)}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </header>
        <div className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
          <Clock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>{t('profile.lockedUnpaid')}</p>
        </div>
      </div>
    );
  }

  // Barra lateral de escritorio: ubicación, contacto, acciones. Van juntos a la
  // izquierda para que, en pantallas anchas, queden AL LADO del contenido (bio,
  // detalles, reseñas) en vez de arriba, reduciendo el scroll. En móvil se apila.
  const aside = (
    <aside className="space-y-4 lg:order-2 lg:sticky lg:top-4">
      {(hasCoords || mapsHref) && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-1.5 font-semibold text-slate-900">
            <MapPin className="h-4 w-4 text-brand-500" aria-hidden="true" /> {t('profile.location')}
          </h2>
          {profile.address && <p className="text-sm text-slate-600">{profile.address}</p>}
          {hasCoords && (
            <Suspense fallback={<div className="h-56 w-full animate-pulse rounded-2xl bg-slate-100" />}>
              <ProviderMiniMap lat={profile.latitude as number} lng={profile.longitude as number} />
            </Suspense>
          )}
          {mapsHref && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted">{t('profile.howToGet')}</span>
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Navigation className="h-4 w-4 text-brand-600" aria-hidden="true" /> Google Maps
              </a>
              {wazeHref && (
                <a
                  href={wazeHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Navigation className="h-4 w-4 text-sky-500" aria-hidden="true" /> Waze
                </a>
              )}
            </div>
          )}
        </section>
      )}

      {/* Datos de contacto de la ficha sin reclamar (fuentes públicas). Da
          confianza al visitante mientras el titular no gestiona su perfil. Los
          miembros con cuenta usan sus botones de contacto/reserva. */}
      {isFicha && (profile.phone || website || profile.address || profile.services_offered) && (
        <section className="rounded-2xl border border-slate-100 bg-white p-4">
          <h2 className="mb-2 font-semibold text-slate-900">{t('profile.contact')}</h2>
          <ul className="space-y-1.5 text-sm text-slate-700">
            {profile.phone && (
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                <a href={`tel:${profile.phone}`} className="hover:underline">{profile.phone}</a>
              </li>
            )}
            {website && safeHttpUrl(website) && (
              <li className="flex items-center gap-2">
                <Globe className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                <a href={safeHttpUrl(website)!} target="_blank" rel="noopener noreferrer" className="break-all hover:underline">
                  {website.replace(/^https?:\/\//i, '')}
                </a>
              </li>
            )}
            {profile.address && (
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                <span>{profile.address}</span>
              </li>
            )}
          </ul>
          {profile.services_offered && <p className="mt-2 text-sm text-slate-600">{profile.services_offered}</p>}
        </section>
      )}

      {/* Ficha sin reclamar: nota informativa (tono suave, no de advertencia). */}
      {isFicha && (
        <div className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
          <Clock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>{t('profile.lockedUnclaimed')}</p>
        </div>
      )}

      {!isFicha && (isParent || isConsumer || (isProvider && userId !== id)) && (
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

      {/* Gratitud contextual: a la familia que acaba de encontrar especialista. */}
      {(isParent || isConsumer) && <DonateCallout variant="directory" />}
    </aside>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
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
          {(profile.sections ?? []).length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-muted">{t('profile.servesAreas')}</span>
              {(profile.sections ?? []).map((sv) => {
                const def = SECTION_BY_VALUE[sv];
                if (!def) return null;
                return (
                  <span
                    key={sv}
                    title={t(`sections.${sv}.desc`)}
                    className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', def.chip)}
                  >
                    {t(`sections.${sv}.name`)}
                  </span>
                );
              })}
              <SectionsExplainer className="ml-0.5" />
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <EVSBadge score={rating?.evs_score ?? null} totalReviews={rating?.total_reviews ?? 0} size="lg" />
            <DistintivoBadge badge={badge} size="md" showLabel showReview={userId === id} />
          </div>
          {(() => {
            const quality = qualityBadge(profile.provider_type, rating?.evs_score ?? null, rating?.total_reviews ?? 0);
            const qualityLabel = quality === 'productos-alta-calidad' ? t('memberBadges.productsQuality') : t('memberBadges.servicesQuality');
            const hasAny = profile.neuroaffirming || profile.is_inclusive_school || profile.is_inclusive_company || profile.is_institutional_ally || quality;
            if (!hasAny) return null;
            return (
            <div className="mt-2 flex flex-wrap items-center gap-4">
              {quality && (
                <span className="inline-flex items-center gap-2" title={qualityLabel}>
                  <img src={badgeArt(quality, i18n.language)} alt={qualityLabel} className="h-14 w-14 object-contain" loading="lazy" />
                  <span className="text-sm font-semibold text-slate-800">{qualityLabel}</span>
                </span>
              )}
              {profile.neuroaffirming && (
                <span className="inline-flex items-center gap-2" title={t('neuro.sealHint')}>
                  <img src={badgeArt('neuroafirmativo', i18n.language)} alt={t('neuro.seal')} className="h-14 w-14 object-contain" loading="lazy" />
                  <span className="text-sm font-semibold text-slate-800">{t('neuro.seal')}</span>
                </span>
              )}
              {profile.is_inclusive_school && (
                <span className="inline-flex items-center gap-2" title={t('memberBadges.inclusiveSchool')}>
                  <img src={badgeArt('escuela-inclusiva', i18n.language)} alt={t('memberBadges.inclusiveSchool')} className="h-14 w-14 object-contain" loading="lazy" />
                  <span className="text-sm font-semibold text-slate-800">{t('memberBadges.inclusiveSchool')}</span>
                </span>
              )}
              {profile.is_inclusive_company && (
                <span className="inline-flex items-center gap-2" title={t('memberBadges.inclusiveCompany')}>
                  <img src={badgeArt('empresa-inclusiva', i18n.language)} alt={t('memberBadges.inclusiveCompany')} className="h-14 w-14 object-contain" loading="lazy" />
                  <span className="text-sm font-semibold text-slate-800">{t('memberBadges.inclusiveCompany')}</span>
                </span>
              )}
              {profile.is_institutional_ally && (
                <span className="inline-flex items-center gap-2" title={t('memberBadges.institutionalAlly')}>
                  <img src={badgeArt('aliados-neuromundi', i18n.language)} alt={t('memberBadges.institutionalAlly')} className="h-14 w-14 object-contain" loading="lazy" />
                  <span className="text-sm font-semibold text-slate-800">{t('memberBadges.institutionalAlly')}</span>
                </span>
              )}
            </div>
            );
          })()}
          {(profile.year_started != null || profile.certified_staff) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {profile.year_started != null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> {t('profile.sinceYear', { year: profile.year_started })}
                </span>
              )}
              {profile.certified_staff && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  <UserCheck className="h-3.5 w-3.5" aria-hidden="true" /> {t('profile.certifiedStaff')}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {profile.bio && <p className="max-w-3xl text-slate-700 leading-relaxed">{profile.bio}</p>}

      {/* Escritorio: dos columnas — columna principal ancha (detalles, reseñas,
          ofertas) a la IZQUIERDA y lateral (ubicación, contacto, acciones) a la
          DERECHA. El orden se invierte solo en `lg` con `order`, así el móvil
          conserva su orden de apilado (lateral primero). */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:items-start">
        {aside}

        <div className="min-w-0 space-y-6 lg:order-1">
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

          {/* Detalles estructurados del servicio (como el directorio de referencia):
              población atendida, modalidad, especialidades, áreas, condiciones,
              metodologías/certificaciones y accesibilidad. Cada grupo solo aparece si
              el prestador lo declaró. Los certificados son nombres propios (sin
              traducir); el resto se localiza por catálogo. */}
          {(() => {
            const pd = (profile.provider_details ?? {}) as Record<string, unknown>;
            const certs = Array.isArray(pd.certifications) ? (pd.certifications as string[]) : [];
            const access = Array.isArray(pd.accessibility) ? (pd.accessibility as string[]) : [];
            const groups: { key: string; values: string[]; plain?: boolean }[] = [
              { key: 'profile.ageServed', values: profile.age_ranges ?? [] },
              { key: 'profile.modalitiesLabel', values: profile.modalities ?? [] },
              { key: 'profile.specialtiesLabel', values: profile.specialties ?? [] },
              { key: 'profile.areasLabel', values: profile.intervention_areas ?? [] },
              { key: 'profile.conditionsLabel', values: profile.neuro_conditions ?? [] },
              { key: 'profile.methodologiesLabel', values: certs, plain: true },
              { key: 'profile.accessibilityLabel', values: access },
            ].filter((g) => g.values.length > 0);
            if (groups.length === 0) return null;
            return (
              <section className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4">
                {groups.map((g) => (
                  <div key={g.key}>
                    <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{t(g.key)}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {g.values.map((v) => (
                        <span key={v} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-sm text-brand-800">
                          {g.plain ? v : catLabel(v, v)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            );
          })()}

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
      </div>

      {reviewOpen && (
        <ProviderReviewModal
          providerId={id}
          providerName={profile.business_name ?? profile.full_name ?? ''}
          providerType={profile.provider_type ?? null}
          onClose={() => setReviewOpen(false)}
        />
      )}
    </div>
  );
}
