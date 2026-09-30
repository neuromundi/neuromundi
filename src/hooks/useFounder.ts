/**
 * useFounder — programa "Miembro Fundador".
 *
 * DETECCIÓN (useFounderAutoClaim): sólo LEE. El lugar de fundador se otorga tras
 * el pago, en el webhook de Stripe (`grant_founder_seat`). Este hook detecta que
 * ya fue otorgado, muestra el distintivo y dispara la felicitación una vez.
 *
 * La tarifa de fundador NO depende de tener el asiento: el checkout la decide
 * con `founder_eligible()` (plazo vigente + cupo disponible), de modo que el
 * precio cobrado coincida con el que promete el correo de invitación.
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

export type FounderKind = 'families' | 'professionals' | 'providers' | 'companies';

/** Mapea el rol / tipo de proveedor al grupo de fundador correspondiente. */
export function founderKindFor(role: string | null | undefined, providerType: ProviderType | null | undefined): FounderKind | null {
  if (role === 'parent' || role === 'patient') return 'families';
  if (role === 'provider') {
    if (providerType === 'company') return 'companies'; // empresas: track propio (cupo 20 + 2 vacantes)
    return providerType === 'merchant' ? 'providers' : 'professionals';
  }
  return null; // admin u otros: no participan
}

/** ¿Este id de perfil es Miembro Fundador? (lectura pública). */
export const FOUNDER_CAPACITY: Record<FounderKind, number> = {
  families: 500,
  // D1 (29 sep 2026): ampliado de 100 a 300/150. Al retirar la escalera de
  // descuento, quien no alcanza asiento paga la tarifa ordinaria — el doble de
  // la que promete el correo de invitación. De los 100 invitados, 92 caen en
  // 'professionals' y 8 en 'providers'. Debe coincidir con founder_capacity()
  // en SQL (migración 0149); mientras vivan en dos lugares pueden divergir.
  professionals: 300,
  providers: 150,
  companies: 20,
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
  const { userId, role, needsOnboarding } = useAuth();
  const profile = useAuthStore((s) => s.profile);
  const [isFounder, setIsFounder] = useState(false);
  // `justClaimed`: acaba de obtener el cupo AHORA (no lo tenía antes) → dispara
  // el popup de felicitación con el aviso de los 3 meses.
  const [justClaimed, setJustClaimed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!userId || !profile) return;
    // NO reclamar mientras el usuario aún no termina su registro (login social en
    // curso): si lo hiciéramos, alguien que entra con Google y luego pulsa
    // "Cancelar y cerrar sesión" igual recibiría el distintivo y la felicitación.
    if (needsOnboarding) return;
    // Descarta admins y roles que no participan en el programa.
    if (!founderKindFor(role, profile.provider_type ?? null)) return;

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

    // YA NO se reclama el asiento al entrar. El lugar de fundador lo otorga el
    // webhook de Stripe tras el pago (grant_founder_seat). Reclamarlo en la
    // primera visita hacía que un visitante que nunca pagaba bloqueara un lugar
    // durante tres meses (grace_until), y que el contador de lugares restantes
    // contara visitantes como fundadores.
    //
    // Este efecto ahora sólo LEE: detecta que el asiento ya fue otorgado y
    // dispara la felicitación una sola vez, que es justo después de pagar.
    const vistoKey = `nm_founder_visto_${userId}`;
    (async () => {
      const { data: existing } = await supabase
        .from('founder_members')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (cancelled || !existing) return;
      setIsFounder(true);
      if (!localStorage.getItem(vistoKey)) {
        localStorage.setItem(vistoKey, '1');
        setJustClaimed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, role, profile, needsOnboarding]);

  return { isFounder, justClaimed };
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

    const [founderRow, benefitCount, blogCount, offerRow, referralRes, vacancyRes] = await Promise.all([
      supabase.from('founder_members').select('user_id').eq('user_id', userId).maybeSingle(),
      supabase.from('discount_transactions').select('id', { count: 'exact', head: true }).eq('provider_id', userId).eq('status', 'completed'),
      supabase.from('content_posts').select('id', { count: 'exact', head: true }).eq('author_id', userId),
      supabase.from('offers').select('discount_value').eq('provider_id', userId).eq('status', 'active').eq('discount_type', 'percentage').gte('discount_value', 10).limit(1),
      supabase.rpc('my_referral_count'),
      // Vacantes activas (solo relevante para empresas).
      kind === 'companies'
        ? supabase.from('job_openings').select('id', { count: 'exact', head: true }).eq('company_id', userId).eq('is_active', true)
        : Promise.resolve({ count: 0 }),
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
      vacancyCount: vacancyRes.count ?? 0,
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
  const { userId, needsOnboarding } = useAuth();
  const { progress } = useFounderProgress();
  const toast = useToast();
  const { t } = useTranslation();
  const shown = useRef(false);

  useEffect(() => {
    // No mostrar el aviso mientras el usuario aún no termina su registro (login
    // social en curso): el porcentaje no tiene sentido antes de completar el alta.
    if (needsOnboarding) return;
    if (!userId || !progress || shown.current) return;
    const key = `nm_founder_notice_${userId}`;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key)) { shown.current = true; return; }
    shown.current = true;
    try { sessionStorage.setItem(key, '1'); } catch { /* ignore */ }
    toast.info(t('founderReq.notice', { pct: progress.pct }));
  }, [userId, needsOnboarding, progress, toast, t]);
}
