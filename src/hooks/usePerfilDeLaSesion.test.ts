import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuthStore } from '@/stores/authStore';
import { usePerfilDeLaSesion } from './usePerfilDeLaSesion';

const perfilFalso = { id: 'u1', full_name: 'Prueba' } as never;

describe('usePerfilDeLaSesion', () => {
  beforeEach(() => {
    useAuthStore.setState({ profile: null, profileError: null });
  });

  it('sin perfil y sin error todavia no es fallo: es que esta cargando', () => {
    const { result } = renderHook(() => usePerfilDeLaSesion());
    expect(result.current.fallo).toBe(false);
    expect(result.current.perfil).toBeNull();
  });

  it('sin perfil y con error SI es fallo', () => {
    useAuthStore.setState({ profile: null, profileError: 'no se pudo' });
    const { result } = renderHook(() => usePerfilDeLaSesion());
    expect(result.current.fallo).toBe(true);
  });

  it('con perfil, un error de relectura no borra lo que ya se puede pintar', () => {
    useAuthStore.setState({ profile: perfilFalso, profileError: 'fallo al releer' });
    const { result } = renderHook(() => usePerfilDeLaSesion());
    expect(result.current.fallo).toBe(false);
    expect(result.current.perfil).toBe(perfilFalso);
  });
});
