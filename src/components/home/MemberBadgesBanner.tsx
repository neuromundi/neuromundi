/**
 * MemberBadgesBanner — banner público de la portada que informa los distintivos
 * que Neuromundi otorga a sus miembros (Verificado, Neuroafirmativo, Miembro
 * Fundador, Aliado Destacado, Distintivo por tipo de miembro y Neuromundi ID),
 * cada uno con su descripción. Genera confianza y prueba social. Lleva a la
 * página pública de verificación (/verificados).
 */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Award, ShieldCheck, HeartHandshake, Crown, Star, BadgeCheck, QrCode, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';

const BADGES = [
  { key: 'verified', Icon: ShieldCheck, accent: 'border-l-brand-600', iconBg: 'bg-brand-600', text: 'text-brand-800' },
  { key: 'neuroaffirming', Icon: HeartHandshake, accent: 'border-l-violet-600', iconBg: 'bg-violet-600', text: 'text-violet-800' },
  { key: 'founder', Icon: Crown, accent: 'border-l-amber-600', iconBg: 'bg-amber-600', text: 'text-amber-800' },
  { key: 'ally', Icon: Star, accent: 'border-l-teal-600', iconBg: 'bg-teal-600', text: 'text-teal-800' },
  { key: 'memberType', Icon: BadgeCheck, accent: 'border-l-sky-700', iconBg: 'bg-sky-700', text: 'text-sky-900' },
  { key: 'neuroId', Icon: QrCode, accent: 'border-l-slate-600', iconBg: 'bg-slate-600', text: 'text-slate-800' },
] as const;

export function MemberBadgesBanner() {
  const { t } = useTranslation();
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

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {BADGES.map(({ key, Icon, accent, iconBg, text }) => (
          <div key={key} className={`rounded-2xl border border-slate-100 border-l-4 ${accent} bg-white p-4 shadow-sm`}>
            <div className="flex items-center gap-2.5">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg} text-white`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className={`text-sm font-bold leading-snug ${text}`}>{t(`memberBadges.${key}.name`)}</h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">{t(`memberBadges.${key}.desc`)}</p>
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
