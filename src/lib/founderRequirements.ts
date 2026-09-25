/**
 * founderRequirements — motor puro de cumplimiento de requisitos de Fundador.
 *
 * A partir de datos reales del usuario (perfil, ofertas, transacciones
 * verificadas por QR, publicaciones) calcula, por cada requisito medible, una
 * fracción de avance 0..1, y un porcentaje global de cumplimiento. La plataforma
 * es sensible a cada requisito: p. ej., cuando se otorgan descuentos/consultas y
 * se verifican con el QR del usuario (discount_transactions 'completed'), el
 * avance del beneficio comunitario sube y el porcentaje se actualiza.
 */
import type { FounderKind } from '@/hooks/useFounder';

/** Meta de beneficios comunitarios verificados por QR (perfiles de pago). */
export const COMMUNITY_BENEFIT_TARGET = 3;
/** Meta de recomendaciones: 5 para familias/pacientes, 3 para los perfiles de pago. */
export const REFERRAL_TARGET_FAMILIES = 5;
export const REFERRAL_TARGET_OTHER = 3;
/** Longitud mínima para considerar la biografía "completa". */
export const BIO_MIN = 60;

export interface FounderInputs {
  isFounder: boolean;
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
  cedula: string | null;
  providerType: string | null;
  membershipActive: boolean;
  hasDiscount10: boolean;
  verifiedBenefitCount: number; // transacciones verificadas por QR (status completed)
  blogPosts: number;
  referralCount: number; // personas registradas con su enlace de recomendación
  vacancyCount?: number; // vacantes activas (solo empresas): meta 2
}

/** Vacantes activas que debe publicar una empresa inclusiva para ser Fundadora. */
export const COMPANY_VACANCY_TARGET = 2;

export interface FounderReqItem {
  key: string;      // clave i18n: founderReq.<key>
  fraction: number; // 0..1
  met: boolean;
  progress?: { current: number; target: number }; // para requisitos contables
}

export interface FounderProgress {
  items: FounderReqItem[];
  pct: number; // 0..100
  metCount: number;
  total: number;
}

const bin = (ok: boolean): number => (ok ? 1 : 0);

export function computeFounderProgress(kind: FounderKind, i: FounderInputs): FounderProgress {
  const items: FounderReqItem[] = [];
  const push = (key: string, fraction: number, progress?: { current: number; target: number }) =>
    items.push({ key, fraction: Math.max(0, Math.min(1, fraction)), met: fraction >= 1, progress });

  // Empresas inclusivas: requisitos propios (primeras 20 por país + 2 vacantes).
  // Registro gratuito: no se les exige cuota, foto/bio/teléfono ni recomendaciones.
  if (kind === 'companies') {
    push('slot', bin(i.isFounder));
    const vac = i.vacancyCount ?? 0;
    push('vacancies', vac / COMPANY_VACANCY_TARGET, {
      current: Math.min(vac, COMPANY_VACANCY_TARGET),
      target: COMPANY_VACANCY_TARGET,
    });
    const totalC = items.length;
    const sumC = items.reduce((a, it) => a + it.fraction, 0);
    return { items, pct: totalC === 0 ? 0 : Math.round((sumC / totalC) * 100), metCount: items.filter((it) => it.met).length, total: totalC };
  }

  // Comunes a todos los demás perfiles.
  push('slot', bin(i.isFounder));
  push('photo', bin(!!i.avatarUrl));
  push('bio', bin(!!i.bio && i.bio.trim().length >= BIO_MIN));
  push('contact', bin(!!i.phone));

  if (kind === 'families') {
    push('blog', bin(i.blogPosts >= 1));
    // Las familias conservan la recomendación a la comunidad (meta 5).
    push('referrals', i.referralCount / REFERRAL_TARGET_FAMILIES, {
      current: Math.min(i.referralCount, REFERRAL_TARGET_FAMILIES),
      target: REFERRAL_TARGET_FAMILIES,
    });
  } else {
    // Profesionales y prestadores (perfiles de pago). Se ELIMINARON como
    // requisitos los "beneficios verificados por QR" y las "recomendaciones";
    // basta con cuota cubierta, descuento activo y los datos de perfil.
    if (kind === 'professionals' && i.providerType === 'service_provider') {
      push('cedula', bin(!!i.cedula));
    }
    push('fee', bin(i.membershipActive));
    push('discount', bin(i.hasDiscount10));
  }

  const total = items.length;
  const sum = items.reduce((a, it) => a + it.fraction, 0);
  const pct = total === 0 ? 0 : Math.round((sum / total) * 100);
  const metCount = items.filter((it) => it.met).length;
  return { items, pct, metCount, total };
}
