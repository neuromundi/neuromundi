/**
 * useShop — Fase 6 (mini-tienda + afiliados).
 *  - useStore: catálogo de productos activos + compra (Stripe Checkout), con
 *    promedio de reseñas y confianza del vendedor para las tarjetas.
 *  - useAffiliate: el especialista ve/crea su código de afiliado y sus ganancias.
 *  - getRefCode/setRefCode: captura del código de referido (?ref=) en localStorage.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toMessage } from '@/lib/utils';
import type { Tables } from '@/types/database';
import type { Result } from '@/types/app';

export type Product = Tables<'products'>;
export type AffiliateCode = Tables<'affiliate_codes'>;
export type Order = Tables<'orders'>;

const REF_KEY = 'neuro.ref';

export function getRefCode(): string | null {
  try { return localStorage.getItem(REF_KEY); } catch { return null; }
}
export function setRefCode(code: string): void {
  try { localStorage.setItem(REF_KEY, code.toUpperCase()); } catch { /* ignore */ }
}

export interface ProductRating { avg: number; count: number }
export interface SellerTrust { verified: boolean; memberNo: number | null }

// ── Tienda ─────────────────────────────────────────────────────────────────────
export function useStore() {
  const [products, setProducts] = useState<Product[]>([]);
  const [ratings, setRatings] = useState<Record<string, ProductRating>>({});
  const [sellers, setSellers] = useState<Record<string, SellerTrust>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('status', 'approved')
        .not('price', 'is', null)
        .order('created_at', { ascending: false })
        .limit(60);
      const list = data ?? [];
      setProducts(list);
      setLoading(false);

      if (list.length > 0) {
        const productIds = list.map((p) => p.id);
        const vendorIds = [...new Set(list.map((p) => p.vendor_id))];
        // Promedios de reseñas (vista pública; degrada si 0017 no está aplicada).
        const { data: rt } = await supabase
          .from('public_product_ratings' as never)
          .select('product_id, avg_rating, review_count')
          .in('product_id', productIds);
        const rmap: Record<string, ProductRating> = {};
        for (const r of (rt ?? []) as unknown as { product_id: string; avg_rating: number; review_count: number }[]) {
          rmap[r.product_id] = { avg: Number(r.avg_rating) || 0, count: Number(r.review_count) || 0 };
        }
        setRatings(rmap);
        // Confianza del vendedor (solo perfiles publicados son legibles por RLS).
        const { data: vs } = await supabase
          .from('profiles')
          .select('id, is_verified, member_no')
          .in('id', vendorIds);
        const smap: Record<string, SellerTrust> = {};
        for (const v of vs ?? []) {
          smap[v.id] = { verified: !!v.is_verified, memberNo: v.member_no ?? null };
        }
        setSellers(smap);
      }
    })();
  }, []);

  const buy = useCallback(async (productId: string): Promise<Result<string>> => {
    try {
      const { data, error } = await supabase.functions.invoke('create-product-checkout', {
        body: { productId, affiliateCode: getRefCode() ?? undefined },
      });
      if (error) throw error;
      const url = (data as { url?: string })?.url;
      if (!url) throw new Error('Sin URL de pago');
      window.location.href = url;
      return { ok: true, data: url };
    } catch (e) {
      return { ok: false, error: toMessage(e, 'No se pudo iniciar la compra.') };
    }
  }, []);

  return { products, ratings, sellers, loading, buy };
}

// ── Afiliados ──────────────────────────────────────────────────────────────────
export function useAffiliate() {
  const { userId } = useAuth();
  const [code, setCode] = useState<AffiliateCode | null>(null);
  const [earnings, setEarnings] = useState<{ sales: number; commission_cents_total: number; currency: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [{ data: c }, { data: e }] = await Promise.all([
      supabase.from('affiliate_codes').select('*').eq('provider_id', userId).maybeSingle(),
      supabase.from('affiliate_earnings').select('*').eq('affiliate_id', userId),
    ]);
    setCode(c ?? null);
    setEarnings((e as { sales: number; commission_cents_total: number; currency: string }[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const createCode = useCallback(async (desired: string, pct: number): Promise<Result<true>> => {
    if (!userId) return { ok: false, error: 'Sin sesión' };
    const clean = desired.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
    if (clean.length < 3) return { ok: false, error: 'Código muy corto.' };
    const { error } = await supabase
      .from('affiliate_codes')
      .upsert({ provider_id: userId, code: clean, commission_pct: pct }, { onConflict: 'provider_id' });
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [userId, load]);

  return { code, earnings, loading, reload: load, createCode };
}
