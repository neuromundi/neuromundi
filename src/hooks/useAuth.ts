/**
 * useAuth — acceso a la sesión y acciones de autenticación.
 *
 * Envuelve el store de Zustand para que los componentes nunca toquen Supabase
 * Auth directamente. Expone estado derivado (isAuthenticated, isProvider…) y las
 * acciones (signIn, signUp, signOut).
 */
import { useAuthStore } from '@/stores/authStore';
import type { ProviderType, UserRole } from '@/types/app';

export interface UseAuthValue {
  status: 'loading' | 'authenticated' | 'unauthenticated';
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  email: string | null;
  role: UserRole | null;
  providerType: ProviderType | null;
  isProvider: boolean;
  isParent: boolean;
  isPatient: boolean;
  isConsumer: boolean;
  isAdmin: boolean;
  fullName: string | null;
  avatarUrl: string | null;
  needsOnboarding: boolean;
  signIn: ReturnType<typeof useAuthStore.getState>['signIn'];
  signUp: ReturnType<typeof useAuthStore.getState>['signUp'];
  completeProfile: ReturnType<typeof useAuthStore.getState>['completeProfile'];
  signInWithProvider: ReturnType<typeof useAuthStore.getState>['signInWithProvider'];
  completeOnboarding: ReturnType<typeof useAuthStore.getState>['completeOnboarding'];
  signOut: ReturnType<typeof useAuthStore.getState>['signOut'];
  refreshProfile: ReturnType<typeof useAuthStore.getState>['refreshProfile'];
}

export function useAuth(): UseAuthValue {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const completeProfile = useAuthStore((s) => s.completeProfile);
  const signInWithProvider = useAuthStore((s) => s.signInWithProvider);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const signOut = useAuthStore((s) => s.signOut);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const role = profile?.role ?? null;

  return {
    status,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    userId: user?.id ?? null,
    email: user?.email ?? null,
    role,
    providerType: profile?.provider_type ?? null,
    isProvider: role === 'provider',
    isParent: role === 'parent',
    isPatient: role === 'patient',
    isConsumer: role === 'parent' || role === 'patient',
    isAdmin: role === 'admin',
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    needsOnboarding: status === 'authenticated' && !!profile && !profile.rules_version_accepted,
    signIn,
    signUp,
    completeProfile,
    signInWithProvider,
    completeOnboarding,
    signOut,
    refreshProfile,
  };
}
