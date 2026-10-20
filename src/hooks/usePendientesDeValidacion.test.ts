/**
 * Contador de perfiles que esperan validación.
 *
 * Existe porque hasta el 20 de octubre de 2026 nada en el panel decía cuántos
 * perfiles estaban detenidos esperando una decisión del administrador: había
 * que entrar a Moderación y a Exenciones y contarlos a ojo. Estas pruebas
 * fijan las tres cosas que pueden mentir: que un fallo de la consulta NO se
 * vea como «no hay nada pendiente», que los números del servidor (que llegan
 * como texto) se lean como números, y que a un asesor no se le pregunte nada.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc } }));

import { usePendientesDeValidacion } from './usePendientesDeValidacion';

beforeEach(() => rpc.mockReset());

describe('cuántos perfiles esperan validación', () => {
  it('lee los números aunque el servidor los mande como texto', async () => {
    rpc.mockResolvedValue({
      data: [{
        sin_filtro_cero: '3',
        sin_publicar: '2',
        documentos_por_revisar: '0',
        documento_mas_antiguo: null,
      }],
      error: null,
    });

    const { result } = renderHook(() => usePendientesDeValidacion());

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.pendientes).toEqual({
      sinFiltroCero: 3,
      sinPublicar: 2,
      documentosPorRevisar: 0,
      documentoMasAntiguo: null,
    });
    expect(result.current.fallo).toBeNull();
    expect(rpc).toHaveBeenCalledWith('admin_pendientes_de_validacion');
  });

  it('un fallo de la consulta no se convierte en ceros tranquilizadores', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'sin conexión' } });

    const { result } = renderHook(() => usePendientesDeValidacion());

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.pendientes).toBeNull();
    expect(result.current.fallo).toBeTruthy();
  });

  it('a un asesor no se le pregunta nada, porque no ve esas secciones', async () => {
    const { result } = renderHook(() => usePendientesDeValidacion(false));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(rpc).not.toHaveBeenCalled();
    expect(result.current.pendientes).toBeNull();
  });

  it('conserva la fecha del documento más antiguo sin revisar', async () => {
    rpc.mockResolvedValue({
      data: [{
        sin_filtro_cero: 1,
        sin_publicar: 0,
        documentos_por_revisar: 2,
        documento_mas_antiguo: '2026-10-14T18:00:00Z',
      }],
      error: null,
    });

    const { result } = renderHook(() => usePendientesDeValidacion());

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.pendientes?.documentosPorRevisar).toBe(2);
    expect(result.current.pendientes?.documentoMasAntiguo).toBe('2026-10-14T18:00:00Z');
  });
});
