/**
 * useAdminMembers — tabla de control de miembros para el administrador.
 *
 * Hasta ahora el panel tenía 25 pantallas y ninguna actuaba sobre la cuenta de
 * un miembro: `AdminRenewals` listaba vencimientos y `AdminAccountActions`
 * contaba bajas, las dos de sólo lectura. Este hook expone el listado y las
 * acciones (migración 0155), todas acotadas a `is_admin()` en el servidor.
 *
 * NO incluye baja definitiva: borrar una cuenta destruye datos que no vuelven,
 * así que sigue siendo un camino aparte y deliberado, no un botón más en una
 * tabla donde se hacen diez cosas rutinarias.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type EstadoFiltro = 'todos' | 'activo' | 'pendiente' | 'exento' | 'suspendido' | 'vencido';
export type FundadorFiltro = 'todos' | 'si' | 'no';

export interface Facetas { paises: string[]; tipos: string[] }

export interface AdminMember {
  id: string;
  member_no: number | null;
  full_name: string | null;
  business_name: string | null;
  email: string | null;
  role: string | null;
  provider_type: string | null;
  affiliate_type: string | null;
  country: string | null;
  membership_status: string | null;
  membership_period: string | null;
  membership_paid_until: string | null;
  membership_due_at: string | null;
  suspended_at: string | null;
  suspend_until: string | null;
  is_published: boolean | null;
  es_fundador: boolean | null;
  ficha_id: string | null;
  ficha_verificada: boolean | null;
  sections: string[] | null;
  created_at: string;
}

type Rpc = { rpc: (f: string, a?: unknown) => Promise<{ data: unknown; error: { message: string } | null }> };

export function useAdminMembers() {
  const [items, setItems] = useState<AdminMember[]>([]);
  const [estado, setEstado] = useState<EstadoFiltro>('todos');
  const [q, setQ] = useState('');
  const [pais, setPais] = useState('');
  const [seccion, setSeccion] = useState('');
  const [fundador, setFundador] = useState<FundadorFiltro>('todos');
  const [tipo, setTipo] = useState('');
  // Países y tipos que de verdad existen: no tiene sentido ofrecer filtros que
  // no devuelven a nadie.
  const [facetas, setFacetas] = useState<Facetas>({ paises: [], tipos: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: e } = await (supabase as unknown as Rpc)
      .rpc('admin_members', {
        p_estado: estado,
        p_q: q || null,
        p_limit: 300,
        p_pais: pais || null,
        p_seccion: seccion || null,
        p_fundador: fundador === 'todos' ? null : fundador === 'si',
        p_tipo: tipo || null,
      });
    if (e) { setError(e.message); setItems([]); } else { setItems((data as AdminMember[] | null) ?? []); }
    setLoading(false);
  }, [estado, q, pais, seccion, fundador, tipo]);

  // La búsqueda espera a que la persona deje de escribir: cada pulsación
  // dispararía una consulta a una RPC que recorre perfiles y directorio.
  useEffect(() => {
    const id = setTimeout(() => { void load(); }, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [load, q]);

  /** Envuelve cada acción: ejecuta, propaga el error y recarga la lista. */
  const accion = useCallback(async (fn: string, args: Record<string, unknown>) => {
    const { error: e } = await (supabase as unknown as Rpc).rpc(fn, args);
    if (e) throw new Error(e.message);
    await load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      const { data } = await (supabase as unknown as Rpc).rpc('admin_members_facetas');
      const f = Array.isArray(data) ? (data[0] as Facetas | undefined) : (data as Facetas | null);
      if (f) setFacetas({ paises: f.paises ?? [], tipos: f.tipos ?? [] });
    })();
  }, []);

  return {
    items, loading, error, reload: load,
    estado, setEstado, q, setQ,
    pais, setPais, seccion, setSeccion, fundador, setFundador, tipo, setTipo, facetas,
    suspender:   (id: string, meses: number, nota?: string) =>
      accion('admin_member_suspend', { p_user: id, p_meses: meses, p_nota: nota ?? null }),
    reactivar:   (id: string, nota?: string) =>
      accion('admin_member_reactivate', { p_user: id, p_nota: nota ?? null }),
    exentar:     (id: string, valor: boolean, nota?: string) =>
      accion('admin_member_set_exempt', { p_user: id, p_value: valor, p_nota: nota ?? null }),
    prorrogar:   (id: string, dias: number, nota?: string) =>
      accion('admin_member_extend', { p_user: id, p_dias: dias, p_nota: nota ?? null }),
    verificarFicha: (fichaId: string, valor: boolean) =>
      accion('admin_set_ficha_verificada', { p_id: fichaId, p_value: valor }),
  };
}
