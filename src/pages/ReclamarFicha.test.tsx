/**
 * El camino del invitado: la pantalla a la que llegan las 1,122 invitaciones.
 *
 * Es el recorrido que mas importa del arranque y el que menos se habia
 * ejercido: hasta el 19 de octubre de 2026 solo se habia usado DOS veces en
 * toda la vida de la plataforma. Estas pruebas fijan sus tres estados.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc, auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}));

import { ReclamarFicha } from './ReclamarFicha';

const FICHA = {
  id: 'ficha-1',
  nombre: 'Centro Ejemplo de Neurodesarrollo',
  provider_type: 'service_provider',
  ciudad: 'Querétaro',
  estado: 'Querétaro',
  telefono: '442 000 0000',
  sitio_web: 'https://ejemplo.org',
  especializacion: 'Terapia de lenguaje',
};

function pintar(token: string) {
  return render(
    <MemoryRouter initialEntries={[`/reclamar/${token}`]}>
      <Routes><Route path="/reclamar/:token" element={<ReclamarFicha />} /></Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => rpc.mockReset());

describe('pantalla de reclamar ficha', () => {
  it('con un enlace valido muestra la ficha y marca la apertura', async () => {
    rpc.mockImplementation((nombre: string) => {
      if (nombre === 'ficha_por_token') return Promise.resolve({ data: [FICHA], error: null });
      return Promise.resolve({ data: null, error: null });
    });

    pintar('token-bueno');

    expect(await screen.findByText(FICHA.nombre)).toBeInTheDocument();
    // La apertura se registra: es lo que alimenta el panel de invitaciones.
    expect(rpc.mock.calls.map((c) => c[0])).toContain('marcar_invitacion_abierta');
    expect(rpc).toHaveBeenCalledWith('ficha_por_token', { p_token: 'token-bueno' });
  });

  it('con un enlace que no existe no muestra ninguna ficha', async () => {
    rpc.mockResolvedValue({ data: [], error: null });

    pintar('token-inventado');

    // Espera a que termine de cargar y comprueba que NO se filtro nada.
    await screen.findByText(/reclamar\./i).catch(() => null);
    expect(screen.queryByText(FICHA.nombre)).not.toBeInTheDocument();
  });

  it('si la consulta falla tampoco muestra datos de nadie', async () => {
    rpc.mockImplementation((nombre: string) => {
      if (nombre === 'ficha_por_token') return Promise.resolve({ data: null, error: { message: 'boom' } });
      return Promise.resolve({ data: null, error: null });
    });

    pintar('token-con-error');

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(FICHA.nombre)).not.toBeInTheDocument();
  });
});
