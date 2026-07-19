/**
 * useProductModeration — el admin lista productos por estado y aprueba/rechaza.
 * Compromiso operativo: revisar en ≤24 h. No se admiten "productos milagro".
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toMessage } from '@/lib/utils';
import type { Tables } from '@/types/database';
import type { Result } from '@/types/app';

export type ModProduct = Tables<'products'> & { vendor?: { full_name: string | null; business_name: string | null } };
export type ProductFilter = 'pending' | 'approved' | 'rejected';

export function useProductModeration(filter: ProductFilter) {
  const [items, setItems] = useState<ModProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*, vendor:profiles!products_vendor_id_fkey(full_name, business_name)')
      .eq('status', filter)
      .order('created_at', { ascending: false })
      .limit(100);
    setItems((data as unknown as ModProduct[]) ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  const approve = useCallback(async (id: string): Promise<Result<true>> => {
    const { error } = await supabase
      .from('products')
      .update({ status: 'approved', review_note: null, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return { ok: false, error: toMessage(error) };
    setItems((p) => p.filter((x) => x.id !== id));
    return { ok: true, data: true };
  }, []);

  const reject = useCallback(async (id: string, note: string): Promise<Result<true>> => {
    const { error } = await supabase
      .from('products')
      .update({ status: 'rejected', review_note: note || null, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return { ok: false, error: toMessage(error) };
    // Notificar al proveedor por correo SOLO cuando NO se aprueba.
    void supabase.functions.invoke('send-product-rejection', { body: { productId: id, reason: note } });
    setItems((p) => p.filter((x) => x.id !== id));
    return { ok: true, data: true };
  }, []);

  const suspend = useCallback(async (id: string, note: string): Promise<Result<true>> => {
    // Suspender = sacar de la tienda volviéndolo a 'rejected' con motivo.
    const { error } = await supabase
      .from('products')
      .update({ status: 'rejected', review_note: note || null, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return { ok: false, error: toMessage(error) };
    void supabase.functions.invoke('send-product-rejection', { body: { productId: id, reason: note } });
    setItems((p) => p.filter((x) => x.id !== id));
    return { ok: true, data: true };
  }, []);

  // Marca/desmarca un producto como destacado (promoción en la portada de la tienda).
  const toggleFeatured = useCallback(async (id: string, value: boolean): Promise<Result<true>> => {
    const { error } = await supabase.from('products').update({ is_featured: value }).eq('id', id);
    if (error) return { ok: false, error: toMessage(error) };
    setItems((p) => p.map((x) => (x.id === id ? { ...x, is_featured: value } : x)));
    return { ok: true, data: true };
  }, []);

  return { items, loading, reload: load, approve, reject, suspend, toggleFeatured };
}
