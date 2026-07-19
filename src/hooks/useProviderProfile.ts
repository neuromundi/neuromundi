/**
 * useProviderProfile — perfil público de un proveedor por id.
 *
 * Lee el perfil publicado (RLS lo permite a anónimos) y sus categorías. El EVS y
 * el radar se obtienen aparte con `useProviderRatings`, y las ofertas con
 * `useOffers`. Aquí solo el encabezado del perfil.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toMessage } from '@/lib/utils';
import type { Category, Profile, ProviderSummary } from '@/types/app';

export interface UseProviderProfileValue {
  profile: Profile | null;
  categories: Category[];
  network: ProviderSummary[];
  loading: boolean;
  error: string | null;
}

export function useProviderProfile(id: string | null): UseProviderProfileValue {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [network, setNetwork] = useState<ProviderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: prof, error: pErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .eq('is_published', true)
          .maybeSingle();
        if (pErr) throw pErr;
        if (cancelled) return;
        setProfile(prof ?? null);

        if (prof) {
          const { data: pc } = await supabase
            .from('provider_categories')
            .select('category_id')
            .eq('provider_id', id);
          const catIds = (pc ?? []).map((r) => r.category_id);
          if (catIds.length) {
            const { data: cats } = await supabase.from('categories').select('*').in('id', catIds);
            if (!cancelled) setCategories(cats ?? []);
          }

          // Red pública: conexiones aceptadas del proveedor visto.
          const { data: conns } = await supabase
            .from('provider_connections')
            .select('requester_id, addressee_id')
            .eq('status', 'accepted')
            .or(`requester_id.eq.${id},addressee_id.eq.${id}`);
          const otherIds = (conns ?? []).map((c) =>
            c.requester_id === id ? c.addressee_id : c.requester_id,
          );
          if (otherIds.length) {
            const { data: profs } = await supabase
              .from('profiles')
              .select('id, full_name, business_name, city, avatar_url, provider_type')
              .in('id', otherIds)
              .eq('is_published', true);
            if (!cancelled) {
              setNetwork(
                (profs ?? []).map((p) => ({
                  id: p.id,
                  name: p.business_name ?? p.full_name,
                  city: p.city,
                  avatar_url: p.avatar_url,
                  provider_type: p.provider_type,
                })),
              );
            }
          }
        }
      } catch (e) {
        if (!cancelled) setError(toMessage(e, 'No se pudo cargar el proveedor.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { profile, categories, network, loading, error };
}
