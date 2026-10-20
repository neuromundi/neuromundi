/**
 * Moderación de artículos.
 *
 * Existe porque hasta el 19 de octubre de 2026 el artículo de un miembro salía
 * al blog público en el instante, sin que nadie lo viera antes: con 1,122
 * invitaciones saliendo, un blog abierto de par en par. Estas pruebas fijan la
 * bandeja de revisión y, sobre todo, dos cosas que ya fallaron una vez en esta
 * plataforma: que un fallo de la consulta NO se vea como una bandeja vacía, y
 * que la nota del administrador llegue íntegra al autor.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc } }));

import { useContenidoEnRevision } from './useContenidoEnRevision';

const ARTICULO = {
  id: 'art-1',
  title: 'Cómo acompañar una crisis sensorial',
  body: 'Texto completo del artículo.',
  revision: 'pendiente',
  autor: 'Ana Ruiz',
};

beforeEach(() => rpc.mockReset());

describe('bandeja de artículos en revisión', () => {
  it('trae los pendientes y pide exactamente ese estado', async () => {
    rpc.mockResolvedValue({ data: [ARTICULO], error: null });

    const { result } = renderHook(() => useContenidoEnRevision('pendiente'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.fallo).toBe(false);
    expect(rpc).toHaveBeenCalledWith('admin_contenido_en_revision', { p_estado: 'pendiente' });
  });

  it('si la consulta falla lo dice: una bandeja vacía no es lo mismo que un fallo', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'sin conexión' } });

    const { result } = renderHook(() => useContenidoEnRevision('pendiente'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual([]);
    expect(result.current.fallo).toBe(true);
  });

  it('aprobar manda la decisión y vuelve a cargar la bandeja', async () => {
    rpc.mockImplementation((nombre: string) =>
      nombre === 'admin_revisar_contenido'
        ? Promise.resolve({ data: { ok: true }, error: null })
        : Promise.resolve({ data: [], error: null }),
    );

    const { result } = renderHook(() => useContenidoEnRevision('pendiente'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let salida: { ok: boolean } | undefined;
    await act(async () => { salida = await result.current.revisar('art-1', 'aprobado'); });

    expect(salida).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith('admin_revisar_contenido', {
      p_id: 'art-1', p_decision: 'aprobado', p_nota: null,
    });
    // Recarga: la bandeja no puede quedarse mostrando lo que ya se resolvió.
    expect(rpc.mock.calls.filter((c) => c[0] === 'admin_contenido_en_revision').length).toBeGreaterThan(1);
  });

  it('rechazar lleva la nota íntegra, que es lo que el autor va a leer', async () => {
    rpc.mockImplementation((nombre: string) =>
      nombre === 'admin_revisar_contenido'
        ? Promise.resolve({ data: { ok: true }, error: null })
        : Promise.resolve({ data: [], error: null }),
    );

    const { result } = renderHook(() => useContenidoEnRevision('pendiente'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const nota = 'Falta citar la fuente del estudio que mencionas en el tercer párrafo.';
    await act(async () => { await result.current.revisar('art-1', 'rechazado', nota); });

    expect(rpc).toHaveBeenCalledWith('admin_revisar_contenido', {
      p_id: 'art-1', p_decision: 'rechazado', p_nota: nota,
    });
  });

  it('si la base rechaza la decisión, NO se da por buena', async () => {
    rpc.mockImplementation((nombre: string) =>
      nombre === 'admin_revisar_contenido'
        ? Promise.resolve({ data: null, error: { message: 'no autorizado' } })
        : Promise.resolve({ data: [ARTICULO], error: null }),
    );

    const { result } = renderHook(() => useContenidoEnRevision('pendiente'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let salida: { ok: boolean; error?: string } | undefined;
    await act(async () => { salida = await result.current.revisar('art-1', 'aprobado'); });

    expect(salida?.ok).toBe(false);
    expect(salida?.error).toBe('no autorizado');
  });
});
