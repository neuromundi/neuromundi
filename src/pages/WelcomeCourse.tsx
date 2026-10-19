/**
 * WelcomeCourse — curso virtual de bienvenida (/curso-bienvenida). Acceso para
 * miembros con sesión (al confirmar el correo ya pueden entrar). Muestra los
 * módulos introductorios y, si el admin lo configuró, el enlace al grupo privado.
 *
 * El video todavía no existe (18 oct 2026). Antes había un reproductor apuntando
 * a `public/curso-bienvenida.{webm,mp4}`: como los archivos no estaban, el
 * visitante veía un recuadro negro roto y no entendía por qué. En su lugar va un
 * aviso que dice cuándo estará. Cuando el video exista, se sustituye este aviso
 * por el reproductor.
 */
import { useTranslation } from 'react-i18next';
import { GraduationCap, PlayCircle, Users, Check, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui';
import { useCampaign } from '@/hooks/useCampaign';

export function WelcomeCourse() {
  const { t } = useTranslation();
  const { config } = useCampaign();
  const modules = (t('course.modules', { returnObjects: true }) as string[]) ?? [];
  const community = config?.community_url ?? null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
          <GraduationCap className="h-4 w-4" aria-hidden="true" /> {t('course.badge')}
        </span>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-900">{t('course.title')}</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">{t('course.intro')}</p>
      </header>

      {/* Aviso en lugar del video, que todavía no existe. */}
      <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50/60 p-6 text-center">
        <CalendarClock className="mx-auto h-9 w-9 text-brand-600" aria-hidden="true" />
        <h2 className="mt-3 font-bold text-slate-900">{t('course.soonTitle')}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">{t('course.soonBody')}</p>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-900"><PlayCircle className="h-5 w-5 text-brand-600" /> {t('course.modulesTitle')}</h2>
        <ul className="space-y-2">
          {modules.map((m, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-700">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage-600" aria-hidden="true" />
              <span>{m}</span>
            </li>
          ))}
        </ul>
      </section>

      {community && (
        <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50/60 p-5 text-center">
          <Users className="mx-auto h-8 w-8 text-brand-600" aria-hidden="true" />
          <h2 className="mt-2 font-bold text-slate-900">{t('course.communityTitle')}</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">{t('course.communityBody')}</p>
          <Button className="mt-3" size="lg" onClick={() => window.open(community, '_blank', 'noopener,noreferrer')} leadingIcon={<Users className="h-5 w-5" />}>
            {t('course.communityCta')}
          </Button>
        </div>
      )}
    </div>
  );
}
