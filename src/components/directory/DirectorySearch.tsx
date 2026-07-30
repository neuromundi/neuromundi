/**
 * DirectorySearch — página del directorio público.
 *
 * Orquesta filtros (texto con debounce de 300ms, categoría, ciudad, radio),
 * la lista de ProviderCard y el MapView, manteniéndolos sincronizados por
 * `selectedId`. En móvil alterna lista/mapa; en escritorio van lado a lado.
 */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, List, MapPin, Globe, BellPlus, X, SlidersHorizontal, HeartPulse, PawPrint, Baby, GraduationCap, Package, Palette, Sparkles, LocateFixed, Loader2, Dumbbell, Ticket, Scale, HeartHandshake, HandHeart, Briefcase } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProviderCard } from './ProviderCard';
import { MapView } from './MapView';
import { SearchableSelect, type Option } from './SearchableSelect';
import { SkeletonCard, useToast } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useSearchAlerts } from '@/hooks/useSearchAlerts';
import { useDirectory, type DirectoryFilters } from '@/hooks/useDirectory';
import { SPECIALTIES, INTERVENTION_AREAS, MODALITIES, AGE_RANGES } from '@/data/specialistCatalog';
import { PRODUCT_CATEGORIES } from '@/data/providerCatalog';
import { useCatLabel } from '@/lib/catLabel';
import { usePublicLocations } from '@/hooks/useProviderLocations';
import { useCategories } from '@/hooks/useCategories';
import { useCountry } from '@/stores/countryStore';
import { COUNTRIES } from '@/data/countries';
import { cn } from '@/lib/utils';

const RADII = [5, 10, 25, 50] as const;

/**
 * Accesos rápidos por dominio: cada uno apunta a valores REALES de la taxonomía
 * (profesión, especialidad, área o categoría de producto) vía el filtro `anyOf`.
 */
const DOMAINS: Record<string, { icon: typeof HeartPulse; labelKey: string; values?: string[]; providerTypes?: string[]; href?: string }> = {
  therapies: {
    icon: HeartPulse, labelKey: 'directory.quick.therapies',
    values: ['integracion_sensorial', 'modificacion_conducta', 'lenguaje_habla', 'saac', 'motricidad', 'regulacion_emocional', 'terapia_ocupacional', 'logopedia', 'psicomotricidad', 'fisioterapia', 'musicoterapia', 'arteterapia', 'neurofeedback', 'terapia_neurosensorial', 'estimulacion_auditiva', 'regulacion_polivagal', 'procesamiento_visual', 'optometria_comportamental'],
  },
  animals: {
    icon: PawPrint, labelKey: 'directory.quick.animals',
    values: ['taa_equinoterapia', 'taa_perros', 'taa_granja', 'entrenador_psaa', 'certificador_aae', 'adiestramiento_positivo', 'veterinaria_neurofriendly', 'cuidado_mascotas_nf', 'mascotas_nf'],
  },
  perinatal: {
    icon: Baby, labelKey: 'directory.quick.perinatal',
    values: ['lactancia', 'lactancia_motricidad_oral', 'consultoria_sueno', 'asesoria_porteo', 'terapia_miofuncional', 'perinatal'],
  },
  executive: {
    icon: GraduationCap, labelKey: 'directory.quick.executive',
    values: ['funciones_ejecutivas', 'adaptacion_curricular', 'coaching_ejecutivo', 'acompanante_terapeutico', 'vida_independiente', 'psicopedagogia', 'educacion_especial'],
  },
  arts: {
    icon: Palette, labelKey: 'directory.quick.arts',
    values: ['musicoterapia', 'arteterapia', 'danzaterapia', 'profesor_musica_adaptada', 'instructor_artes_visuales', 'coach_teatro', 'organizador_eventos_sensory', 'director_ensamble_nd', 'gestor_colectivo_artistico', 'mentor_artistas', 'agente_talento_inclusivo', 'expresion_creativa', 'movimiento_danza', 'teatro_rol', 'ocio_sensorial', 'arte_musica'],
  },
  products: {
    icon: Package, labelKey: 'directory.quick.products',
    values: ['sensorial', 'cognitivo', 'comunicacion', 'autonomia', 'social_emocional', 'neurosensorial_tech', 'mascotas_nf', 'perinatal'],
  },
  // Accesos rápidos por TIPO de proveedor (además de los de taxonomía de arriba).
  wellness: { icon: Dumbbell, labelKey: 'directory.quick.wellness', providerTypes: ['wellness'] },
  leisure: { icon: Ticket, labelKey: 'directory.quick.leisure', providerTypes: ['tourism'] },
  legal: { icon: Scale, labelKey: 'directory.quick.legal', providerTypes: ['legal'] },
  ngo: { icon: HeartHandshake, labelKey: 'directory.quick.ngo', providerTypes: ['ngo'] },
  caregivers: { icon: HandHeart, labelKey: 'directory.quick.caregivers', providerTypes: ['caregiver'] },
  // "Empleo" no es un proveedor: lleva a la sección de oportunidades.
  employment: { icon: Briefcase, labelKey: 'directory.quick.employment', href: '/inclusion-laboral' },
};

export interface DirectorySearchProps {
  onViewProfile?: (id: string) => void;
}

export function DirectorySearch({ onViewProfile }: DirectorySearchProps) {
  const { categories } = useCategories();
  const { country, setCountry } = useCountry();
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const { alerts, create: createAlert, remove: removeAlert } = useSearchAlerts();
  const { t, i18n } = useTranslation();
  const catLabel = useCatLabel();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Lista de países con nombre localizado (value = nombre canónico, para filtrar).
  const countries = useMemo(() => {
    let display: (code: string) => string = (c) => c;
    try {
      const dn = new Intl.DisplayNames([i18n.language], { type: 'region' });
      display = (code) => dn.of(code) ?? code;
    } catch { /* usa el nombre en español */ }
    return COUNTRIES
      .map((c) => ({ value: c.name, label: display(c.code) || c.name }))
      .sort((a, b) => a.label.localeCompare(b.label, i18n.language));
  }, [i18n.language]);

  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  // Categoría de alto nivel: se retiraron los chips del directorio; se conserva
  // solo por compatibilidad con enlaces profundos (?cat=) y con las alertas.
  const categoryId = searchParams.get('cat') ? Number(searchParams.get('cat')) : undefined;
  const [specialty, setSpecialty] = useState<string>(searchParams.get('spec') ?? '');
  const [productCategory, setProductCategory] = useState<string>(searchParams.get('pcat') ?? '');
  const [ageRange, setAgeRange] = useState<string>(searchParams.get('age') ?? '');
  const [modality, setModality] = useState<string>(searchParams.get('mod') ?? '');
  const [city, setCity] = useState<string | undefined>();
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(25);
  const [locating, setLocating] = useState(false);

  /** Pide la ubicación al navegador (solo con este gesto explícito del usuario)
   *  y activa el filtrado por cercanía. Respeta la privacidad: nunca se solicita
   *  de forma automática. Si se deniega o no está disponible, se avisa sin romper. */
  const locateMe = () => {
    if (!('geolocation' in navigator)) {
      toast.error(t('directory.geoUnavailable'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast.error(t('directory.geoDenied'));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [domain, setDomain] = useState<string | null>(null);
  const [neuro, setNeuro] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Opciones del selector con búsqueda: condiciones + áreas de intervención.
  const specialtyOptions = useMemo<Option[]>(
    () => [
      ...SPECIALTIES.filter((s) => s.value !== 'otro').map((s) => ({ value: s.value, label: catLabel(s.value, s.label), group: t('directory.grpSpecialties') })),
      ...INTERVENTION_AREAS.filter((a) => a.value !== 'otro').map((a) => ({ value: a.value, label: catLabel(a.value, a.label), group: t('directory.grpAreas') })),
    ],
    [catLabel, t],
  );

  const activeCount =
    (specialty ? 1 : 0) + (productCategory ? 1 : 0) + (ageRange ? 1 : 0) + (modality ? 1 : 0) + (city ? 1 : 0) + (center ? 1 : 0);

  // Debounce de 300ms en el texto de búsqueda.
  useEffect(() => {
    const t = setTimeout(() => setQuery(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filters: DirectoryFilters = useMemo(
    () => ({
      query,
      categoryId,
      specialty: specialty || undefined,
      productCategory: productCategory || undefined,
      ageRange: ageRange || undefined,
      modality: modality || undefined,
      anyOf: domain ? DOMAINS[domain].values : undefined,
      providerTypes: domain ? DOMAINS[domain].providerTypes : undefined,
      neuroaffirming: neuro || undefined,
      city,
      country: country || undefined,
      center: center ?? undefined,
      radiusKm: center ? radiusKm : undefined,
    }),
    [query, categoryId, specialty, productCategory, ageRange, modality, domain, neuro, city, country, center, radiusKm],
  );

  const { filtered, cities, loading } = useDirectory(filters);
  const providerIds = useMemo(() => filtered.map((p) => p.id), [filtered]);
  const mapLocations = usePublicLocations(providerIds);

  const showOnMap = (id: string) => {
    setSelectedId(id);
    setView('map');
  };

  return (
    <div className="mx-auto w-full max-w-6xl p-4">
      {/* Filtros */}
      <div className="space-y-3">
        {/* Selector de país: segmenta el directorio. Si no se eligió en el Home, aquí se elige. */}
        <div className="flex flex-col gap-2 rounded-xl border border-brand-100 bg-brand-50 p-3 sm:flex-row sm:items-center">
          <label htmlFor="dir-country" className="flex shrink-0 items-center gap-2 text-sm font-semibold text-brand-800">
            <Globe className="h-4 w-4" aria-hidden="true" /> {t('directory.countryLabel')}
          </label>
          <select
            id="dir-country"
            aria-label={t('directory.countryLabel')}
            value={country ?? ''}
            onChange={(e) => setCountry(e.target.value || null)}
            className="w-full rounded-xl border border-brand-200 bg-white p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:max-w-xs"
          >
            <option value="">{t('directory.countryAll')}</option>
            {countries.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {country && (
            <button type="button" onClick={() => setCountry(null)} className="text-left text-sm font-semibold text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:ml-auto">
              {t('directory.countryClear')}
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('directory.searchPlaceholder')}
            aria-label={t('directory.searchAria')}
            className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
        </div>

        {/* Accesos rápidos por dominio (apuntan a la taxonomía real) */}
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('directory.quickTitle')}>
          {Object.entries(DOMAINS).map(([key, d]) => {
            const Icon = d.icon;
            const active = domain === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => (d.href ? navigate(d.href) : setDomain(active ? null : key))}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  active ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" /> {t(d.labelKey)}
              </button>
            );
          })}
          {/* Sello Neuromundi: solo proveedores neuroafirmativos. */}
          <button
            type="button"
            aria-pressed={neuro}
            onClick={() => setNeuro((v) => !v)}
            title={t('directory.neuroHint')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              neuro ? 'border-violet-500 bg-violet-500 text-white' : 'border-violet-200 text-violet-700 hover:bg-violet-50',
            )}
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" /> {t('directory.neuroFilter')}
          </button>
        </div>

        {/* En móvil, los filtros finos se pliegan tras este botón. */}
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 md:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          {t('directory.moreFilters')}{activeCount > 0 ? ` (${activeCount})` : ''}
        </button>

        <div className={cn('flex-wrap items-center gap-3', filtersOpen ? 'flex' : 'hidden md:flex')}>
          <SearchableSelect
            options={specialtyOptions}
            value={specialty}
            onChange={setSpecialty}
            placeholder={t('directory.allSpecialties')}
            searchPlaceholder={t('directory.filterSearchPh')}
            noMatches={t('directory.noMatches')}
            ariaLabel={t('directory.specialtyAria')}
            className="min-w-[14rem] flex-1"
          />

          <select
            aria-label={t('directory.productAria')}
            value={productCategory}
            onChange={(e) => setProductCategory(e.target.value)}
            className="rounded-xl border border-slate-200 p-2.5 text-sm"
          >
            <option value="">{t('directory.allProducts')}</option>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{catLabel(c.value, c.label)}</option>
            ))}
          </select>

          <select
            aria-label={t('directory.ageAria')}
            value={ageRange}
            onChange={(e) => setAgeRange(e.target.value)}
            className="rounded-xl border border-slate-200 p-2.5 text-sm"
          >
            <option value="">{t('directory.allAges')}</option>
            {AGE_RANGES.map((a) => (
              <option key={a.value} value={a.value}>{catLabel(a.value, a.label)}</option>
            ))}
          </select>

          <select
            aria-label={t('directory.modalityAria')}
            value={modality}
            onChange={(e) => setModality(e.target.value)}
            className="rounded-xl border border-slate-200 p-2.5 text-sm"
          >
            <option value="">{t('directory.allModalities')}</option>
            {MODALITIES.map((m) => (
              <option key={m.value} value={m.value}>{catLabel(m.value, m.label)}</option>
            ))}
          </select>

          <select
            aria-label={t('directory.cityAria')}
            value={city ?? ''}
            onChange={(e) => setCity(e.target.value || undefined)}
            className="rounded-xl border border-slate-200 p-2.5 text-sm"
          >
            <option value="">{t('directory.allCities')}</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {!center ? (
            <button
              type="button"
              onClick={locateMe}
              disabled={locating}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-100 disabled:opacity-60"
            >
              {locating ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <LocateFixed className="h-4 w-4" aria-hidden="true" />
              )}
              {locating ? t('directory.locating') : t('directory.nearMe')}
            </button>
          ) : (
            <label className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <LocateFixed className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="font-semibold">{t('directory.nearActive')}</span>
              <select
                aria-label={t('directory.radiusAria')}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="rounded-lg border border-emerald-200 bg-white p-1.5 text-sm"
              >
                {RADII.map((r) => (
                  <option key={r} value={r}>
                    {r} km
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setCenter(null)}
                className="ml-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 underline-offset-2 hover:underline"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" /> {t('directory.clearLocation')}
              </button>
            </label>
          )}
          {!center && (
            <span className="text-xs text-muted">
              {t('directory.nearHint')}
            </span>
          )}
        </div>

        {/* Alertas de búsqueda: avísame cuando se publique un especialista que
            coincida con estos filtros. Solo con sesión (hay que saber a quién). */}
        {isAuthenticated && (
          <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-slate-700">{t('alerts.prompt')}</span>
              <button
                type="button"
                onClick={async () => {
                  const r = await createAlert({ country: country || undefined, categoryId, city });
                  toast[r === 'ok' ? 'success' : r === 'dup' ? 'info' : 'error'](
                    r === 'ok' ? t('alerts.created') : r === 'dup' ? t('alerts.dup') : t('alerts.needCriteria'),
                  );
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                <BellPlus className="h-4 w-4" aria-hidden="true" /> {t('alerts.save')}
              </button>
            </div>
            {alerts.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {alerts.map((a) => {
                  const cat = a.category_id != null ? categories.find((c) => c.id === a.category_id) : null;
                  const parts = [a.country, cat ? catLabel(cat.slug, cat.name) : null, a.city].filter(Boolean);
                  return (
                    <li key={a.id} className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-2.5 py-1 text-xs text-slate-700">
                      <span>{parts.join(' · ') || t('alerts.any')}</span>
                      <button type="button" onClick={() => void removeAlert(a.id)} aria-label={t('common.delete')} className="text-slate-400 hover:text-evs-1">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* Alternancia móvil */}
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 md:hidden" role="tablist" aria-label={t('directory.viewList')}>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'list'}
            onClick={() => setView('list')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold',
              view === 'list' ? 'bg-white text-brand-700 shadow-sm' : 'text-muted',
            )}
          >
            <List className="h-4 w-4" aria-hidden="true" /> {t('directory.viewList')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'map'}
            onClick={() => setView('map')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold',
              view === 'map' ? 'bg-white text-brand-700 shadow-sm' : 'text-muted',
            )}
          >
            <MapPin className="h-4 w-4" aria-hidden="true" /> {t('directory.viewMap')}
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* Lista */}
        <div className={cn('space-y-3', view === 'map' && 'hidden md:block')}>
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-muted">
              {t('directory.empty')}
            </div>
          ) : (
            filtered.map((p) => (
              <ProviderCard
                key={p.id}
                provider={p}
                highlighted={p.id === selectedId}
                onViewProfile={onViewProfile}
                onShowOnMap={showOnMap}
              />
            ))
          )}
        </div>

        {/* Mapa */}
        <div
          className={cn(
            'h-[70vh] md:sticky md:top-4 md:h-[calc(100vh-2rem)]',
            view === 'list' && 'hidden md:block',
          )}
        >
          <MapView
            providers={filtered}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onViewProfile={onViewProfile}
            center={center}
            radiusKm={radiusKm}
            onLocate={setCenter}
            locations={mapLocations}
          />
        </div>
      </div>
    </div>
  );
}
