/**
 * Cobro de la membresía: las reglas que tocan el dinero de la gente.
 *
 * No se prueba el cobrador (eso vive en el servidor de pagos), sino lo que
 * decide la plataforma antes de cobrar. Dos reglas que no pueden romperse sin
 * que alguien pague de más: a quien está EXENTO no se le cotiza nada, y a
 * quien ya está AL CORRIENTE no se le vuelve a pedir pago.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const { rpc, perfil } = vi.hoisted(() => ({
  rpc: vi.fn(),
  perfil: { valor: null as Record<string, unknown> | null },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc,
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: perfil.valor, error: null }) }) }),
    }),
  },
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ userId: 'u-1', role: 'provider', providerType: 'service_provider' }),
}));

import { useMembership } from './useMembership';

const llamadas = () => rpc.mock.calls.map((c) => c[0]);

beforeEach(() => {
  rpc.mockReset().mockResolvedValue({ data: null, error: null });
  perfil.valor = null;
});

describe('cobro de la membresía', () => {
  it('a quien está exento no se le cotiza nada', async () => {
    perfil.valor = { membership_status: 'exempt', membership_due_at: null, membership_paid_until: null, country: 'México' };

    const { result } = renderHook(() => useMembership());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.status).toBe('exempt');
    expect(result.current.quote).toBeNull();
    expect(llamadas()).not.toContain('get_membership_quote');
    expect(llamadas()).not.toContain('my_membership_options');
  });

  it('a quien ya está al corriente no se le vuelve a pedir pago', async () => {
    perfil.valor = { membership_status: 'active', membership_due_at: null, membership_paid_until: '2027-01-01', country: 'México' };

    const { result } = renderHook(() => useMembership());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.quote).toBeNull();
    expect(llamadas()).not.toContain('get_membership_quote');
  });

  it('a quien debe cuota se le cotiza con su tipo y su país', async () => {
    perfil.valor = { membership_status: 'pending', membership_due_at: null, membership_paid_until: null, country: 'Colombia' };
    rpc.mockImplementation((nombre: string) =>
      nombre === 'get_membership_quote'
        ? Promise.resolve({ data: [{ currency: 'COP', amount: 120000 }], error: null })
        : Promise.resolve({ data: null, error: null }),
    );

    const { result } = renderHook(() => useMembership());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.quote).toEqual({ currency: 'COP', amount: 120000 });
    expect(rpc).toHaveBeenCalledWith('get_membership_quote', {
      p_type: 'service_provider',
      p_country: 'Colombia',
    });
  });

  it('si falla un descuento no se cae el cobro: queda en cero y sigue', async () => {
    perfil.valor = { membership_status: 'pending', membership_due_at: null, membership_paid_until: null, country: 'México' };
    rpc.mockImplementation((nombre: string) => {
      if (nombre === 'my_membership_discount') return Promise.reject(new Error('sin conexión'));
      if (nombre === 'get_membership_quote') return Promise.resolve({ data: [{ currency: 'MXN', amount: 3600 }], error: null });
      return Promise.resolve({ data: null, error: null });
    });

    const { result } = renderHook(() => useMembership());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.referralPct).toBe(0);
    expect(result.current.quote).toEqual({ currency: 'MXN', amount: 3600 });
  });
});
