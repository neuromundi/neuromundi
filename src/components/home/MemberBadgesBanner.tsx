/**
 * MemberBadgesBanner — banner público de la portada que muestra los DISTINTIVOS
 * OFICIALES que Neuromundi otorga a sus miembros, con su arte real y su
 * descripción. Genera confianza y prueba social. Lleva a la página pública de
 * verificación (/verificados).
 *
 * Los tres niveles del distintivo del prestador (Miembro Verificado → Aliado
 * Destacado → Embajador) viven en public/badges/*.jpg; el de fundador en
 * public/badges/soy-fundador-neuromundi.jpg; y el de miembro global en
 * public/badge/neuromundi-global-member-512.png.
 */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Award, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { badgeArt } from '@/data/badgeArt';

// `art` = clave en badgeArt (resuelve la imagen por idioma); `name`/`desc` = claves i18n.
const BADGES = [
  { art: 'miembro-verificado', name: 'memberBadges.verified.name', desc: 'memberBadges.verified.desc' },
  { art: 'miembro-destacado', name: 'memberBadges.outstanding.name', desc: 'memberBadges.outstanding.desc' },
  { art: 'embajador-neuromundi', name: 'memberBadges.ambassador.name', desc: 'memberBadges.ambassador.desc' },
  { art: 'soy-fundador-neuromundi', name: 'memberBadges.founder.name', desc: 'memberBadges.founder.desc' },
  { art: 'neuromundi-global-member', name: 'memberBadges.globalMember.name', desc: 'memberBadges.globalMember.desc' },
  { art: 'neuroafirmativo', name: 'neuro.seal', desc: 'memberBadges.neuroaffirmingDesc' },
  { art: 'servicios-alta-calidad', name: 'memberBadges.servicesQuality', desc: 'memberBadges.servicesQualityDesc' },
  { art: 'productos-alta-calidad', name: 'memberBadges.productsQuality', desc: 'memberBadges.productsQualityDesc' },
  { art: 'escuela-inclusiva', name: 'memberBadges.inclusiveSchool', desc: 'memberBadges.inclusiveSchoolDesc' },
  { art: 'empresa-inclusiva', name: 'memberBadges.inclusiveCompany', desc: 'memberBadges.inclusiveCompanyDesc' },
] as const;

export function MemberBadgesBanner() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className="mt-16 rounded-3xl border border-slate-100 bg-gradient-to-br from-brand-50/60 to-white p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Award className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="text-xl font-bold text-slate-900">{t('memberBadges.title')}</h2>
      </div>
      <p className="mt-1 text-sm text-muted">{t('memberBadges.subtitle')}</p>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {BADGES.map(({ art, name, desc }) => (
          <div key={art} className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm">
            <img
              src={badgeArt(art, i18n.language)}
              alt={t(name)}
              width={96}
              height={96}
              loading="lazy"
              decoding="async"
              className="h-24 w-24 shrink-0 object-contain"
            />
            <h3 className="mt-2 text-sm font-bold leading-snug text-slate-900">{t(name)}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">{t(desc)}</p>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <Button variant="secondary" onClick={() => navigate('/verificados')} trailingIcon={<ArrowRight className="h-4 w-4 rtl:rotate-180" />}>
          {t('memberBadges.cta')}
        </Button>
      </div>
    </section>
  );
}
