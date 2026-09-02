/**
 * Benefits — página pública de la campaña de pre-registro (/beneficios). Lista los
 * beneficios de ser Miembro Fundador por tipo de perfil: prestadores de pago,
 * pacientes/familias/tutores, y ONG/empresas con empleo (gratuitas). El destino
 * del botón "Conocer beneficios" del popup de bienvenida.
 */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Award, Check, Users } from 'lucide-react';
import { Button } from '@/components/ui';
import { useCampaign } from '@/hooks/useCampaign';

function ProfileCard({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className={`mb-3 inline-flex rounded-full px-3 py-1 text-sm font-bold text-white ${color}`}>{title}</div>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-700">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage-600" aria-hidden="true" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Benefits() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { config } = useCampaign();
  const community = config?.community_url ?? null;
  const arr = (k: string) => (t(k, { returnObjects: true }) as string[]) ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">
          <Award className="h-4 w-4" aria-hidden="true" /> {t('campaign.benefits.badge')}
        </span>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-900">{t('campaign.benefits.title')}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted">{t('campaign.benefits.intro')}</p>
      </header>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <ProfileCard title={t('campaign.benefits.paid.title')} items={arr('campaign.benefits.paid.items')} color="bg-gradient-to-br from-violet-600 to-indigo-600" />
        <ProfileCard title={t('campaign.benefits.consumer.title')} items={arr('campaign.benefits.consumer.items')} color="bg-gradient-to-br from-sky-500 to-brand-600" />
        <ProfileCard title={t('campaign.benefits.orgs.title')} items={arr('campaign.benefits.orgs.items')} color="bg-gradient-to-br from-slate-600 to-slate-800" />
      </div>

      <div className="mt-8 rounded-3xl border border-brand-100 bg-brand-50/50 p-6 text-center">
        <p className="mx-auto max-w-xl text-sm text-slate-700">{t('campaign.benefits.note')}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button size="lg" onClick={() => navigate('/crear-cuenta')} leadingIcon={<Award className="h-5 w-5" />}>
            {t('campaign.benefits.cta')}
          </Button>
          {community && (
            <Button size="lg" variant="secondary" onClick={() => window.open(community, '_blank', 'noopener,noreferrer')} leadingIcon={<Users className="h-5 w-5" />}>
              {t('course.communityCta')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
