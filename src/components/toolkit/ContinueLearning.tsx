/**
 * ContinueLearning — "continuar donde me quedé" del Kit de Herramientas.
 * Muestra el progreso y enlaza al siguiente módulo sin leer (enlace profundo
 * `/kit?m=<id>`). Si ya se leyó todo, felicita y ofrece repasar. No renderiza
 * nada hasta que el progreso está cargado (evita parpadeo).
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpenCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button, ProgressBar } from '@/components/ui';
import { getModules } from '@/data/toolkit';
import { useToolkitProgress } from '@/hooks/useToolkitProgress';

export function ContinueLearning() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isRead, ready } = useToolkitProgress();
  const modules = useMemo(() => getModules(i18n.language), [i18n.language]);

  if (!ready || modules.length === 0) return null;

  const readCount = modules.filter((m) => isRead(m.id)).length;
  const next = modules.find((m) => !isRead(m.id));
  const pct = Math.round((readCount / modules.length) * 100);
  const started = readCount > 0;

  return (
    <section className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          {next ? <BookOpenCheck className="h-5 w-5" aria-hidden="true" /> : <CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900">
            {next ? (started ? t('continue.resume') : t('continue.start')) : t('continue.done')}
          </h3>
          {next ? (
            <p className="mt-0.5 truncate text-sm text-slate-700">{next.title}</p>
          ) : (
            <p className="mt-0.5 text-sm text-slate-700">{t('continue.doneHelp')}</p>
          )}

          <div className="mt-2">
            <ProgressBar value={pct} max={100} showValue={false} size="sm" label={t('continue.progress', { done: readCount, total: modules.length })} />
            <p className="mt-1 text-xs text-muted">{t('continue.progress', { done: readCount, total: modules.length })}</p>
          </div>

          <Button
            size="sm"
            className="mt-3"
            variant={next ? 'primary' : 'secondary'}
            onClick={() => navigate(next ? `/kit?m=${next.id}` : '/kit')}
            leadingIcon={<ArrowRight className="h-4 w-4" />}
          >
            {next ? t('continue.cta') : t('continue.review')}
          </Button>
        </div>
      </div>
    </section>
  );
}
