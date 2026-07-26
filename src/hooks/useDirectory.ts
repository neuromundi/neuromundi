/**
 * useDirectory — catálogo público de proveedores.
 *
 * Combina perfiles publicados (legibles por anon gracias a RLS), su EVS desde la
 * vista pública y sus categorías, mediante consultas por lote (tipado predecible).
 * Aplica los filtros en cliente: texto (con debounce desde la UI), categoría,
 * ciudad y radio en km respecto a una ubicación.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { haversineKm, toMessage, providerOtherText } from '@/lib/utils';
import { computeBadge, type BadgeResult } from '@/lib/badge';
import { inputsFromRow } from '@/hooks/useProviderBadge';
import { SPECIALTIES, INTERVENTION_AREAS, PROFESSIONS } from '@/data/specialistCatalog';
import { PRODUCT_CATEGORIES } from '@/data/providerCatalog';
import { K_OFFERINGS } from '@/data/kCatalog';
import type {
  Category,
  Profile,
  ProviderRating,
  ProviderWithRating,
} from '@/types/app';

const K_ALL = Object.values(K_OFFERINGS).flat();
const LABEL = new Map<string, string>([
  ...SPECIALTIES.map((x) => [x.value, x.label] as const),
  ...INTERVENTION_AREAS.map((x) => [x.value, x.label] as const),
  ...PROFESSIONS.map((x) => [x.value, x.label] as const),
  ...PRODUCT_CATEGORIES.map((x) => [x.value, x.label] as const),
  ...K_ALL.map((x) => [x.value, x.label] as const),
]);
const labelsOf = (arr?: string[] | null) => (arr ?? []).map((v) => LABEL.get(v) ?? v).join(' ');

export interface DirectoryFilters {
  /** Texto libre (nombre, profesión, especialidad, producto…). */
  query?: string;
  categoryId?: number;
  /** Especialidad o área de intervención (clave canónica). */
  specialty?: string;
  /** Categoría de producto (proveedores). */
  productCategory?: string;
  /** Rango de edad atendido. */
  ageRange?: string;
  /** Acceso rápido por dominio: pasa si la profesión, alguna especialidad, área
   *  o categoría de producto del proveedor está en esta lista. */
  anyOf?: string[];
  /** Modalidad de atención. */
  modality?: string;
  city?: string;
  /** País (nombre) para segmentar el directorio a un solo país. */
  country?: string;
  /** Centro para el filtro por distancia. */
  center?: { lat: number; lng: number };
  /** Radio en km; solo aplica si hay `center`. */
  radiusKm?: number;
}

export interface UseDirectoryValue {
  providers: ProviderWithRating[];
  /** Subconjunto tras aplicar los filtros activos. */
  filtered: ProviderWithRating[];
  cities: string[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDirectory(filters: DirectoryFilters): UseDirectoryValue {
  const [providers, setProviders] = useState<ProviderWithRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const country = filters.country;

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1) Perfiles de proveedores publicados, YA segmentados por país en el
      //    servidor. Clave para escalar: no traemos proveedores de otros países.
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'provider')
        .eq('is_published', true);
      if (country) query = query.eq('country', country);
      const { data: profiles, error: pErr } = await query;
      if (pErr) throw pErr;

      const list: Profile[] = profiles ?? [];
      const ids = list.map((p) => p.id);
      if (ids.length === 0) {
        setProviders([]);
        return;
      }

      // 2) EVS + 3) categorías, en paralelo.
      const [ratingsRes, pcRes, catsRes, badgeRes] = await Promise.all([
        supabase.from('public_provider_ratings').select('*').in('provider_id', ids),
        supabase.from('provider_categories').select('*').in('provider_id', ids),
        supabase.from('categories').select('*'),
        supabase.from('provider_badge_inputs').select('*').in('provider_id', ids),
      ]);

      const badgeMap = new Map<string, BadgeResult>(
        (badgeRes.data ?? []).map((r) => [r.provider_id, computeBadge(inputsFromRow(r))]),
      );

      const ratingMap = new Map<string, ProviderRating>(
        (ratingsRes.data ?? [])
          .filter((r): r is ProviderRating & { provider_id: string } => !!r.provider_id)
          .map((r) => [r.provider_id, r]),
      );
      const catMap = new Map<number, Category>((catsRes.data ?? []).map((c) => [c.id, c]));
      const byProvider = new Map<string, Category[]>();
      for (const pc of pcRes.data ?? []) {
        const cat = catMap.get(pc.category_id);
        if (!cat) continue;
        const arr = byProvider.get(pc.provider_id) ?? [];
        arr.push(cat);
        byProvider.set(pc.provider_id, arr);
      }

      setProviders(
        list.map((p) => ({
          ...p,
          rating: ratingMap.get(p.id) ?? null,
          categories: byProvider.get(p.id) ?? [],
          badge: badgeMap.get(p.id) ?? null,
        })),
      );
    } catch (e) {
      setError(toMessage(e, 'No se pudo cargar el directorio.'));
    } finally {
      setLoading(false);
    }
  }, [country]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const cities = useMemo(
    () =>
      [...new Set(providers.map((p) => p.city).filter((c): c is string => !!c))].sort(),
    [providers],
  );

  const { query, categoryId, specialty, productCategory, ageRange, modality, city, center, radiusKm, anyOf } = filters;

  const filtered = useMemo(() => {
    const q = query?.trim().toLowerCase();
    return providers.filter((p) => {
      if (q) {
        const haystack = [
          p.business_name ?? '', p.full_name, p.profession ?? '', p.bio ?? '',
          labelsOf(p.specialties), labelsOf(p.intervention_areas), labelsOf(p.product_categories),
          (p.products_offered ?? []).join(' '),
          providerOtherText(p.provider_details),
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (categoryId && !p.categories.some((c) => c.id === categoryId)) return false;
      if (specialty) {
        const inSpec = (p.specialties ?? []).includes(specialty);
        const inArea = (p.intervention_areas ?? []).includes(specialty);
        if (!inSpec && !inArea) return false;
      }
      if (productCategory && !(p.product_categories ?? []).includes(productCategory)) return false;
      if (anyOf && anyOf.length > 0) {
        const pool = [
          p.profession ?? '',
          ...(p.specialties ?? []),
          ...(p.intervention_areas ?? []),
          ...(p.product_categories ?? []),
        ];
        if (!anyOf.some((v) => pool.includes(v))) return false;
      }
      if (ageRange && !(p.age_ranges ?? []).includes(ageRange)) return false;
      if (modality && !(p.modalities ?? []).includes(modality)) return false;
      if (city && p.city !== city) return false;
      if (center && radiusKm && p.latitude != null && p.longitude != null) {
        const dist = haversineKm(center, { lat: p.latitude, lng: p.longitude });
        if (dist > radiusKm) return false;
      }
      return true;
    });
  }, [providers, query, categoryId, specialty, productCategory, ageRange, modality, city, center, radiusKm, anyOf]);

  return { providers, filtered, cities, loading, error, refetch };
}
