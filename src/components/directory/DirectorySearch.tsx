/**
 * DirectorySearch — página del directorio público.
 *
 * Orquesta filtros (texto con debounce de 300ms, categoría, ciudad, radio),
 * la lista de ProviderCard y el MapView, manteniéndolos sincronizados por
 * `selectedId`. En móvil alterna lista/mapa; en escritorio van lado a lado.
 */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, List, MapPin, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProviderCard } from './ProviderCard';
import { MapView } from './MapView';
import { SkeletonCard } from '@/components/ui';
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

export interface DirectorySearchProps {
  onViewProfile?: (id: string) => void;
}

export function DirectorySearch({ onViewProfile }: DirectorySearchProps) {
  const { categories } = useCategories();
  const { country, setCountry } = useCountry();
  const { t, i18n } = useTranslation();
  const catLabel = useCatLabel();
  const [searchParams] = useSearchParams();

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
  const [categoryId, setCategoryId] = useState<number | undefined>(
    searchParams.get('cat') ? Number(searchParams.get('cat')) : undefined,
  );
  const [specialty, setSpecialty] = useState<string>(searchParams.get('spec') ?? '');
  const [productCategory, setProductCategory] = useState<string>(searchParams.get('pcat') ?? '');
  const [ageRange, setAgeRange] = useState<string>(searchParams.get('age') ?? '');
  const [modality, setModality] = useState<string>(searchParams.get('mod') ?? '');
  const [city, setCity] = useState<string | undefined>();
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(25);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'map'>('list');

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
      city,
      country: country || undefined,
      center: center ?? undefined,
      radiusKm: center ? radiusKm : undefined,
    }),
    [query, categoryId, specialty, productCategory, ageRange, modality, city, country, center, radiusKm],
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

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('directory.categories')}>
            {categories.map((cat) => {
              const active = cat.id === categoryId;
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCategoryId(active ? undefined : cat.id)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'border-brand-500 bg-brand-500 text-white'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50',
                  )}
                >
                  {catLabel(cat.slug, cat.name)}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label={t('directory.specialtyAria')}
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="rounded-xl border border-slate-200 p-2.5 text-sm"
          >
            <option value="">{t('directory.allSpecialties')}</option>
            <optgroup label={t('directory.grpSpecialties')}>
              {SPECIALTIES.filter((s) => s.value !== 'otro').map((s) => (
                <option key={s.value} value={s.value}>{catLabel(s.value, s.label)}</option>
              ))}
            </optgroup>
            <optgroup label={t('directory.grpAreas')}>
              {INTERVENTION_AREAS.filter((a) => a.value !== 'otro').map((a) => (
                <option key={a.value} value={a.value}>{catLabel(a.value, a.label)}</option>
              ))}
            </optgroup>
          </select>

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

          <label className="flex items-center gap-2 text-sm text-slate-700">
            {t('directory.radius')}
            <select
              aria-label={t('directory.radiusAria')}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              disabled={!center}
              className="rounded-xl border border-slate-200 p-2.5 text-sm disabled:opacity-50"
            >
              {RADII.map((r) => (
                <option key={r} value={r}>
                  {r} km
                </option>
              ))}
            </select>
          </label>
          {!center && (
            <span className="text-xs text-muted">
              {t('directory.radiusHint')}
            </span>
          )}
        </div>

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
