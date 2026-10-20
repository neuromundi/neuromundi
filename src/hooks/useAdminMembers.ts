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
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type EstadoFiltro = 'todos' | 'activo' | 'pendiente' | 'exento' | 'suspendido' | 'vencido';
export type FundadorFiltro = 'todos' | 'si' | 'no';
/** Filtros de sí/no: 'todos' = sin filtrar. */
export type SiNo = 'todos' | 'si' | 'no';

/** 'todos' → null (sin filtrar); 'si'/'no' → booleano. */
const triestado = (v: SiNo): boolean | null => (v === 'todos' ? null : v === 'si');

export interface Facetas { paises: string[]; tipos: string[] }

/** Lo que devuelve `admin_members_pagina`: la fila mas el total del filtro. */
interface FilaConTotal extends AdminMember { total?: number | string | null }

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
  ha_pagado: boolean | null;
  created_at: string;
}

type Rpc = { rpc: (f: string, a?: unknown) => Promise<{ data: unknown; error: { message: string } | null }> };

/**
 * Cuantas filas se piden por pagina. La pantalla no trae el padron entero en
 * cada tecleo, pero YA NO MIENTE sobre lo que falta: `admin_members_pagina`
 * (migracion 0314) devuelve tambien el TOTAL de filas que cumplen el filtro,
 * asi que `recortado` no se adivina comparando con el tope, se sabe. Y la
 * descarga completa pide todas las paginas en vez de exportar lo que se veia.
 *
 * La version anterior pedia 300 filas sin decirlo en ninguna parte y su boton
 * de descarga exportaba justo esas 300 con nombre de respaldo completo.
 * (Repaso adversario, 20 de octubre de 2026.)
 */
const FILAS_POR_PAGINA = 300;
/** Tope de la funcion de la base: no devuelve mas de 5,000 por llamada. */
const MAXIMO_POR_LLAMADA = 5000;

export function useAdminMembers() {
  const [items, setItems] = useState<AdminMember[]>([]);
  const [estado, setEstado] = useState<EstadoFiltro>('todos');
  const [q, setQ] = useState('');
  const [pais, setPais] = useState('');
  const [seccion, setSeccion] = useState('');
  const [fundador, setFundador] = useState<FundadorFiltro>('todos');
  const [tipo, setTipo] = useState('');
  const [publicado, setPublicado] = useState<SiNo>('todos');
  const [reclamado, setReclamado] = useState<SiNo>('todos');
  const [pagado, setPagado] = useState<SiNo>('todos');
  // Países y tipos que de verdad existen: no tiene sentido ofrecer filtros que
  // no devuelven a nadie.
  const [facetas, setFacetas] = useState<Facetas>({ paises: [], tipos: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Cuantas filas cumplen el filtro EN TOTAL, segun la base. null = no se sabe.
  const [total, setTotal] = useState<number | null>(null);

  // Sólo manda la ÚLTIMA petición. La búsqueda dispara una consulta por cada
  // pausa al teclear, y la RPC recorre perfiles y directorio: una respuesta
  // lenta de un filtro anterior podía pintarse encima de la nueva, y el
  // administrador veía una lista que no correspondía a lo que había pedido.
  // (Auditoría 15 oct 2026, hallazgo M-4.)
  const peticion = useRef(0);

  /** Los filtros tal como los pide la funcion de la base. */
  const filtros = useCallback((limite: number, desde: number) => ({
    p_estado: estado,
    p_q: q || null,
    p_limit: limite,
    p_offset: desde,
    p_pais: pais || null,
    p_seccion: seccion || null,
    p_fundador: fundador === 'todos' ? null : fundador === 'si',
    p_tipo: tipo || null,
    p_publicado: triestado(publicado),
    p_reclamado: triestado(reclamado),
    p_pagado: triestado(pagado),
  }), [estado, q, pais, seccion, fundador, tipo, publicado, reclamado, pagado]);

  const load = useCallback(async () => {
    const mia = ++peticion.current;
    setLoading(true);
    setError(null);
    const { data, error: e } = await (supabase as unknown as Rpc)
      .rpc('admin_members_pagina', filtros(FILAS_POR_PAGINA, 0));
    if (mia !== peticion.current) return;
    if (e) {
      setError(e.message);
      setItems([]);
      setTotal(null);
    } else {
      const filas = (data as FilaConTotal[] | null) ?? [];
      setItems(filas);
      // El total viene en cada fila (count sobre la ventana). Sin filas no hay
      // de donde leerlo, y entonces el total ES cero.
      setTotal(filas.length > 0 ? Number(filas[0].total ?? filas.length) : 0);
    }
    setLoading(false);
  }, [filtros]);

  /**
   * Trae TODAS las filas del filtro, pagina por pagina, para la descarga.
   * Antes el boton exportaba las filas que estaban a la vista con el nombre de
   * un respaldo completo. (Repaso adversario, 20 oct 2026.)
   */
  const traerTodas = useCallback(async (): Promise<{ ok: true; filas: AdminMember[] } | { ok: false; error: string }> => {
    const todas: AdminMember[] = [];
    for (let pagina = 0; pagina < 40; pagina += 1) {
      const desde = pagina * MAXIMO_POR_LLAMADA;
      const { data, error: e } = await (supabase as unknown as Rpc)
        .rpc('admin_members_pagina', filtros(MAXIMO_POR_LLAMADA, desde));
      if (e) return { ok: false, error: e.message };
      const filas = (data as FilaConTotal[] | null) ?? [];
      todas.push(...filas);
      if (filas.length < MAXIMO_POR_LLAMADA) break;
    }
    return { ok: true, filas: todas };
  }, [filtros]);

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
    let vivo = true;
    void (async () => {
      const { data } = await (supabase as unknown as Rpc).rpc('admin_members_facetas');
      if (!vivo) return;
      const f = Array.isArray(data) ? (data[0] as Facetas | undefined) : (data as Facetas | null);
      if (f) setFacetas({ paises: f.paises ?? [], tipos: f.tipos ?? [] });
    })();
    return () => { vivo = false; };
  }, []);

  return {
    items, loading, error, reload: load, total, traerTodas,
    // Ya no se adivina comparando con el tope: la base dice cuantas hay.
    recortado: total != null && total > items.length,
    estado, setEstado, q, setQ,
    pais, setPais, seccion, setSeccion, fundador, setFundador, tipo, setTipo, facetas,
    publicado, setPublicado, reclamado, setReclamado, pagado, setPagado,
    suspender:   (id: string, meses: number, nota?: string) =>
      accion('admin_member_suspend', { p_user: id, p_meses: meses, p_nota: nota ?? null }),
    reactivar:   (id: string, nota?: string) =>
      accion('admin_member_reactivate', { p_user: id, p_nota: nota ?? null }),
    exentar:     (id: string, valor: boolean, nota?: string) =>
      accion('admin_member_set_exempt', { p_user: id, p_value: valor, p_nota: nota ?? null }),
    prorrogar:   (id: string, dias: number, nota?: string) =>
      accion('admin_member_extend', { p_user: id, p_dias: dias, p_nota: nota ?? null }),
    // Ajusta el vencimiento a una fecha absoluta, o lo QUITA con fecha = null.
    ajustarVencimiento: (id: string, fechaIso: string | null, nota?: string) =>
      accion('admin_member_set_expiry', { p_user: id, p_fecha: fechaIso, p_nota: nota ?? null }),
    verificarFicha: (fichaId: string, valor: boolean) =>
      accion('admin_set_ficha_verificada', { p_id: fichaId, p_value: valor }),
  };
}
