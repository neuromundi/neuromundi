/**
 * Founders — página pública del muro de Miembros Fundadores (/fundadores).
 *
 * Reconoce, país por país, a quienes creyeron en Neuromundi desde el principio.
 * La lista la cura el admin (solo aparece quien se publica). Incluye selector por
 * país (dentro de FoundersWallSection) y una invitación a sumarse mientras haya
 * cupo. Es una página propia, distinta del muro de DONANTES (/donantes).
 */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Award, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui';
import { FoundersWallSection } from '@/components/founder/FoundersWallSection';
import { useSeo } from '@/hooks/useSeo';

export function Founders() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useSeo({
    title: `${t('foundersWall.title')} — Neuromundi`,
    description: t('foundersPage.intro'),
    path: '/fundadores',
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
          <Award className="h-4 w-4" aria-hidden="true" /> {t('foundersPage.badge')}
        </span>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">{t('foundersWall.title')}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted">{t('foundersPage.intro')}</p>
      </header>

      <div className="mt-8">
        <FoundersWallSection />
      </div>

      <div className="mt-12 rounded-2xl border border-brand-100 bg-brand-50/50 p-6 text-center">
        <h2 className="text-xl font-bold text-slate-900">{t('foundersPage.ctaTitle')}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-700">{t('foundersPage.ctaBody')}</p>
        <Button className="mt-4" size="lg" onClick={() => navigate('/crear-cuenta')} leadingIcon={<UserPlus className="h-5 w-5" aria-hidden="true" />}>
          {t('foundersPage.cta')}
        </Button>
      </div>
    </div>
  );
}
