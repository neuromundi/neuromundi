/**
 * useProducts — catálogo de productos de oferentes afiliados.
 *
 * En modo catálogo lista productos activos (enriquecidos con el nombre del
 * vendedor y la categoría) para que el terapeuta arme la receta. En modo dueño
 * (pasando `vendorId` propio) expone el CRUD del merchant con updates optimistas.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toMessage } from '@/lib/utils';
import type {
  Category,
  Product,
  ProductInsert,
  ProductWithVendor,
  Result,
} from '@/types/app';
import type { TablesUpdate } from '@/types/database';

export type ProductUpdate = TablesUpdate<'products'>;

export interface UseProductsOptions {
  /** Si se pasa, lista los productos de ese vendedor (modo dueño). */
  vendorId?: string | null;
  categoryId?: number;
  /** Solo aplica en modo dueño: incluye inactivos. */
  includeInactive?: boolean;
}

export interface UseProductsValue {
  products: ProductWithVendor[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createProduct: (input: Omit<ProductInsert, 'vendor_id'>) => Promise<Result<Product>>;
  updateProduct: (id: string, patch: ProductUpdate) => Promise<Result<Product>>;
  toggleActive: (id: string, next: boolean) => Promise<Result<Product>>;
  deleteProduct: (id: string) => Promise<Result<true>>;
}

export function useProducts(opts: UseProductsOptions = {}): UseProductsValue {
  const { vendorId, categoryId, includeInactive } = opts;
  const [products, setProducts] = useState<ProductWithVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('products').select('*');
      if (vendorId) query = query.eq('vendor_id', vendorId);
      else query = query.eq('is_active', true);
      if (vendorId && !includeInactive) query = query.eq('is_active', true);
      if (categoryId) query = query.eq('category_id', categoryId);
      query = query.order('created_at', { ascending: false });

      const { data, error: err } = await query;
      if (err) throw err;
      const list: Product[] = data ?? [];

      const vendorIds = [...new Set(list.map((p) => p.vendor_id))];
      const catIds = [...new Set(list.map((p) => p.category_id).filter((c): c is number => c != null))];

      const [vendorsRes, catsRes] = await Promise.all([
        vendorIds.length
          ? supabase.from('profiles').select('id, business_name, full_name').in('id', vendorIds)
          : Promise.resolve({ data: [], error: null }),
        catIds.length
          ? supabase.from('categories').select('id, name').in('id', catIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const vMap = new Map((vendorsRes.data ?? []).map((v) => [v.id, v]));
      const cMap = new Map((catsRes.data ?? []).map((c: Pick<Category, 'id' | 'name'>) => [c.id, c.name]));

      setProducts(
        list.map((p) => ({
          ...p,
          vendorName: vMap.get(p.vendor_id)?.business_name ?? vMap.get(p.vendor_id)?.full_name ?? null,
          categoryName: p.category_id != null ? cMap.get(p.category_id) ?? null : null,
        })),
      );
    } catch (e) {
      setError(toMessage(e, 'No se pudo cargar el catálogo.'));
    } finally {
      setLoading(false);
    }
  }, [vendorId, categoryId, includeInactive]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const createProduct = useCallback<UseProductsValue['createProduct']>(
    async (input) => {
      if (!vendorId) return { ok: false, error: 'Sesión de vendedor no disponible.' };
      try {
        const { data, error: err } = await supabase
          .from('products')
          .insert({ ...input, vendor_id: vendorId })
          .select('*')
          .single();
        if (err) throw err;
        setProducts((prev) => [{ ...data, vendorName: null, categoryName: null }, ...prev]);
        return { ok: true, data };
      } catch (e) {
        return { ok: false, error: toMessage(e, 'No se pudo crear el producto.') };
      }
    },
    [vendorId],
  );

  const updateProduct = useCallback<UseProductsValue['updateProduct']>(async (id, patch) => {
    try {
      const { data, error: err } = await supabase
        .from('products')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (err) throw err;
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...data } : p)),
      );
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: toMessage(e, 'No se pudo actualizar el producto.') };
    }
  }, []);

  const toggleActive = useCallback<UseProductsValue['toggleActive']>(
    async (id, next) => {
      const previous = products;
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: next } : p)));
      try {
        const { data, error: err } = await supabase
          .from('products')
          .update({ is_active: next })
          .eq('id', id)
          .select('*')
          .single();
        if (err) throw err;
        return { ok: true, data };
      } catch (e) {
        setProducts(previous);
        return { ok: false, error: toMessage(e, 'No se pudo cambiar el estado.') };
      }
    },
    [products],
  );

  const deleteProduct = useCallback<UseProductsValue['deleteProduct']>(
    async (id) => {
      const previous = products;
      setProducts((prev) => prev.filter((p) => p.id !== id));
      try {
        const { error: err } = await supabase.from('products').delete().eq('id', id);
        if (err) throw err;
        return { ok: true, data: true };
      } catch (e) {
        setProducts(previous);
        return { ok: false, error: toMessage(e, 'No se pudo eliminar el producto.') };
      }
    },
    [products],
  );

  return useMemo(
    () => ({ products, loading, error, refetch, createProduct, updateProduct, toggleActive, deleteProduct }),
    [products, loading, error, refetch, createProduct, updateProduct, toggleActive, deleteProduct],
  );
}
