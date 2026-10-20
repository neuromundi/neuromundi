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

// La cola se corta en 100 por tanda, y el tope se PUBLICA (ver `recortado`):
// una cola de moderacion que parece vacia cuando no lo esta es peor que una
// cola larga.
const TOPE_COLA = 100;

export function useProductModeration(filter: ProductFilter) {
  const [items, setItems] = useState<ModProduct[]>([]);
  const [loading, setLoading] = useState(true);
  // En una cola de moderacion, «no hay nada pendiente» cuando lo que paso es
  // que no se pudo leer deja productos sin revisar y a nadie enterado.
  // (Repaso adversario, 20 oct 2026.)
  const [fallo, setFallo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*, vendor:profiles!products_vendor_id_fkey(full_name, business_name)')
      .eq('status', filter)
      .order('created_at', { ascending: false })
      .limit(TOPE_COLA);
    if (error) { setFallo(true); setLoading(false); return; }
    setFallo(false);
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

  return { items, loading, fallo, tope: TOPE_COLA, recortado: items.length >= TOPE_COLA, reload: load, approve, reject, suspend, toggleFeatured };
}
