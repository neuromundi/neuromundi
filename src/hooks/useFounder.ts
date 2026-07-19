/**
 * useFounder — programa "Miembro Fundador".
 *
 * DETECCIÓN AUTOMÁTICA (useFounderAutoClaim): mientras haya cupo por país, cuando
 * un usuario registrado (no admin) que cumple los requisitos previstos entra a la
 * plataforma, se le reclama automáticamente un lugar de fundador vía el RPC
 * `claim_founder_slot` (idempotente y con control de capacidad en el servidor).
 * Una vez reclamado, el distintivo aparece solo en su perfil.
 *
 * LECTURA (useFounderStatus): consulta `founder_members` por id de perfil para
 * mostrar el distintivo en cualquier perfil público.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { getFounderOptoutFlag, clearFounderOptoutFlag } from '@/lib/founderPref';
import type { ProviderType } from '@/types/database';

export type FounderKind = 'families' | 'professionals' | 'providers';

/** Mapea el rol / tipo de proveedor al grupo de fundador correspondiente. */
export function founderKindFor(role: string | null | undefined, providerType: ProviderType | null | undefined): FounderKind | null {
  if (role === 'parent' || role === 'patient') return 'families';
  if (role === 'provider') return providerType === 'merchant' ? 'providers' : 'professionals';
  return null; // admin u otros: no participan
}

/** ¿Este id de perfil es Miembro Fundador? (lectura pública). */
export const FOUNDER_CAPACITY: Record<FounderKind, number> = {
  families: 500,
  professionals: 100,
  providers: 100,
};

/**
 * Disponibilidad de cupos de fundador para un país y grupo. Cuenta los fundadores
 * ya registrados en ese país/grupo y lo compara con la meta. `reached` indica que
 * el país ya alcanzó la meta (se debe deshabilitar el espacio de fundador).
 */
export function useFounderCapacity(kind: FounderKind | null, country: string | null | undefined) {
  const [used, setUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!kind || !country) { setUsed(0); setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { count } = await supabase
        .from('founder_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('kind', kind)
        .eq('country', country);
      if (cancelled) return;
      setUsed(count ?? 0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [kind, country]);

  const capacity = kind ? FOUNDER_CAPACITY[kind] : 0;
  const remaining = Math.max(0, capacity - used);
  const reached = !!kind && !!country && used >= capacity;
  return { used, capacity, remaining, reached, loading };
}

export function useFounderStatus(profileId: string | null | undefined) {
  const [isFounder, setIsFounder] = useState(false);
  const [kind, setKind] = useState<FounderKind | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!profileId) { setIsFounder(false); setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('founder_members')
        .select('kind')
        .eq('user_id', profileId)
        .maybeSingle();
      if (cancelled) return;
      setIsFounder(!!data);
      setKind((data?.kind as FounderKind) ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [profileId]);

  return { isFounder, kind, loading };
}

/**
 * Detección automática para el usuario actual: intenta reclamar cupo de fundador
 * una sola vez por sesión. Seguro de llamar siempre (sale temprano si no aplica).
 */
export function useFounderAutoClaim() {
  const { userId, role } = useAuth();
  const profile = useAuthStore((s) => s.profile);
  const [isFounder, setIsFounder] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!userId || !profile) return;
    const kind = founderKindFor(role, profile.provider_type ?? null);
    if (!kind) return; // admin u otros

    // Opción de NO ser Fundador: persiste la baja en el servidor y no reclama.
    if (getFounderOptoutFlag() || profile.wants_founder === false) {
      (async () => {
        if (getFounderOptoutFlag()) {
          await supabase.rpc('set_founder_optout', { p_optout: true });
          clearFounderOptoutFlag();
        }
      })();
      return;
    }

    const sessionKey = `nm_founder_claim_${userId}`;
    (async () => {
      // ¿Ya es fundador? No repetir trabajo.
      const { data: existing } = await supabase
        .from('founder_members')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (existing) { setIsFounder(true); return; }

      // Intentar reclamar solo una vez por sesión (evita golpear el RPC en cada carga).
      if (sessionStorage.getItem(sessionKey)) return;
      sessionStorage.setItem(sessionKey, '1');

      const { data: claimed } = await supabase.rpc('claim_founder_slot', {
        p_kind: kind,
        p_country: profile.country ?? null,
      });
      if (!cancelled && claimed) setIsFounder(true);
    })();
    return () => { cancelled = true; };
  }, [userId, role, profile]);

  return { isFounder };
}

/**
 * useFounderProgress — cumplimiento de requisitos de Fundador del usuario actual.
 * Reúne datos reales (perfil, ofertas ≥10%, transacciones verificadas por QR,
 * publicaciones) y devuelve el porcentaje de cumplimiento y el detalle por
 * requisito. Se recalcula cuando cambian esos datos.
 */
export function useFounderProgress() {
  const { userId, role } = useAuth();
  const profile = useAuthStore((s) => s.profile);
  const [progress, setProgress] = useState<import('@/lib/founderRequirements').FounderProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const kind = founderKindFor(role, profile?.provider_type ?? null);

  const load = useCallback(async () => {
    if (!userId || !profile || !kind) { setLoading(false); return; }
    setLoading(true);
    const [{ computeFounderProgress }] = await Promise.all([import('@/lib/founderRequirements')]);

    const [founderRow, benefitCount, blogCount, offerRow, referralRes] = await Promise.all([
      supabase.from('founder_members').select('user_id').eq('user_id', userId).maybeSingle(),
      supabase.from('discount_transactions').select('id', { count: 'exact', head: true }).eq('provider_id', userId).eq('status', 'completed'),
      supabase.from('content_posts').select('id', { count: 'exact', head: true }).eq('author_id', userId),
      supabase.from('offers').select('discount_value').eq('provider_id', userId).eq('status', 'active').eq('discount_type', 'percentage').gte('discount_value', 10).limit(1),
      supabase.rpc('my_referral_count'),
    ]);

    const details = (profile.provider_details ?? {}) as Record<string, unknown>;
    const detailPct = typeof details.discount_pct === 'number' ? (details.discount_pct as number) : 0;

    const res = computeFounderProgress(kind, {
      isFounder: !!founderRow.data,
      avatarUrl: profile.avatar_url ?? null,
      bio: profile.bio ?? null,
      phone: profile.phone ?? profile.whatsapp ?? null,
      cedula: profile.cedula_profesional ?? null,
      providerType: profile.provider_type ?? null,
      membershipActive: (profile.membership_status ?? '') === 'active',
      hasDiscount10: ((offerRow.data?.length ?? 0) > 0) || detailPct >= 10,
      verifiedBenefitCount: benefitCount.count ?? 0,
      blogPosts: blogCount.count ?? 0,
      referralCount: typeof referralRes.data === 'number' ? referralRes.data : 0,
    });
    setProgress(res);
    setLoading(false);
  }, [userId, profile, kind]);

  useEffect(() => { void load(); }, [load]);

  return { progress, kind, loading, reload: load };
}
/**
 * useFounderProgressNotice — al inicio de la sesión, muestra una sola vez una
 * notificación con el porcentaje de cumplimiento de requisitos de Fundador.
 * Seguro de llamar globalmente: no hace nada para usuarios no elegibles.
 */
export function useFounderProgressNotice() {
  const { userId } = useAuth();
  const { progress } = useFounderProgress();
  const toast = useToast();
  const { t } = useTranslation();
  const shown = useRef(false);

  useEffect(() => {
    if (!userId || !progress || shown.current) return;
    const key = `nm_founder_notice_${userId}`;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key)) { shown.current = true; return; }
    shown.current = true;
    try { sessionStorage.setItem(key, '1'); } catch { /* ignore */ }
    toast.info(t('founderReq.notice', { pct: progress.pct }));
  }, [userId, progress, toast, t]);
}
