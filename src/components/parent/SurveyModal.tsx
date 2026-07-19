/**
 * SurveyModal — encuesta de satisfacción tras un canje.
 *
 * Se abre al detectar una transacción 'pending' (vía Realtime). Es NO cancelable:
 * solo se cierra completando la encuesta o cuando expira la ventana de 10 min.
 * Muestra las 7 dimensiones universales y, solo para service_provider, las 2
 * adicionales. Valida con Zod y, al enviar, muestra el EVS actualizado.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BadgeCheck,
  Heart,
  Accessibility,
  Tag,
  Handshake,
  Waves,
  LifeBuoy,
  Building2,
  GraduationCap,
  Clock,
  PartyPopper,
  TimerOff,
  type LucideIcon,
} from 'lucide-react';
import { Modal, Button, StarRating, EVSBadge } from '@/components/ui';
import { useSurvey, type SurveyContext } from '@/hooks/useSurvey';
import {
  makeSurveySchema,
  emptySurveyValues,
  isSurveyComplete,
  type SurveyFormValues,
} from '@/lib/schemas';
import {
  DIMENSION_META,
  DIMENSION_LABEL_KEY,
  DIMENSION_HELP_KEY,
  dimensionsForProviderType,
  type SurveyDimension,
  type Transaction,
} from '@/types/app';

const ICONS: Record<string, LucideIcon> = {
  BadgeCheck,
  Heart,
  Accessibility,
  Tag,
  Handshake,
  Waves,
  LifeBuoy,
  Building2,
  GraduationCap,
};

const MAX_COMMENT = 500;

type Phase = 'loading' | 'form' | 'thanks' | 'expired' | 'error';

export interface SurveyModalProps {
  transaction: Transaction;
  /** Se llama al cerrar (completada, expirada o con error) para avanzar la cola. */
  onClose: () => void;
  /** Se llama tras un envío exitoso, para refrescar historial. */
  onCompleted?: () => void;
}

function secondsUntil(iso: string): number {
  return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
}

export function SurveyModal({ transaction, onClose, onCompleted }: SurveyModalProps) {
  const { loadContext, submit, submitting } = useSurvey();
  const { t } = useTranslation();

  const [phase, setPhase] = useState<Phase>('loading');
  const [context, setContext] = useState<SurveyContext | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [values, setValues] = useState<SurveyFormValues>(emptySurveyValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [result, setResult] = useState<{ evs: number | null; total: number | null } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntil(transaction.expires_at));

  // Cargar contexto del canje al montar.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await loadContext(transaction);
      if (cancelled) return;
      if (res.ok) {
        setContext(res.data);
        setPhase('form');
      } else {
        setLoadError(res.error);
        setPhase('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [transaction, loadContext]);

  // Cuenta regresiva de expiración (solo durante el formulario).
  useEffect(() => {
    if (phase !== 'form') return;
    const id = window.setInterval(() => {
      const left = secondsUntil(transaction.expires_at);
      setSecondsLeft(left);
      if (left <= 0) setPhase('expired');
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, transaction.expires_at]);

  const providerType = context?.providerType ?? null;
  const activeDims = useMemo(
    () => dimensionsForProviderType(providerType),
    [providerType],
  );
  const complete = isSurveyComplete(values, providerType);

  const setScore = (key: SurveyDimension, v: number) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async () => {
    const schema = makeSurveySchema(providerType);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0];
        if (typeof k === 'string' && !errs[k]) errs[k] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }
    const res = await submit(transaction, values, providerType);
    if (res.ok) {
      setResult({ evs: res.data.evs, total: res.data.totalReviews });
      setPhase('thanks');
      onCompleted?.();
    } else {
      setFieldErrors({ _form: res.error });
    }
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  // ── Render por fase ────────────────────────────────────────────────────────

  if (phase === 'expired') {
    return (
      <Modal
        open
        onClose={onClose}
        dismissible={false}
        title={t('survey.expiredTitle')}
        footer={<Button onClick={onClose}>{t('survey.expiredOk')}</Button>}
      >
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <TimerOff className="h-12 w-12 text-muted" aria-hidden="true" />
          <p className="text-slate-700">
            {t('survey.expiredBody')}
          </p>
        </div>
      </Modal>
    );
  }

  if (phase === 'thanks') {
    return (
      <Modal
        open
        onClose={onClose}
        dismissible={false}
        title={t('survey.thanksTitle')}
        footer={<Button onClick={onClose}>{t('survey.thanksOk')}</Button>}
      >
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <PartyPopper className="h-12 w-12 text-warm-500" aria-hidden="true" />
          <p className="text-slate-700">
            {t('survey.thanksBody')}
          </p>
          {result?.evs != null && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm text-muted">
                {t('survey.newAverage', { name: context?.providerName ?? '' })}
              </span>
              <EVSBadge score={result.evs} totalReviews={result.total} size="lg" />
            </div>
          )}
        </div>
      </Modal>
    );
  }

  if (phase === 'error') {
    return (
      <Modal
        open
        onClose={onClose}
        dismissible={false}
        title={t('survey.errorTitle')}
        footer={<Button onClick={onClose}>{t('survey.close')}</Button>}
      >
        <p className="text-slate-700">{loadError ?? t('survey.errorBody')}</p>
      </Modal>
    );
  }

  // loading / form
  return (
    <Modal
      open
      onClose={onClose}
      dismissible={false}
      title={
        context ? t('survey.title', { name: context.providerName }) : t('survey.titleLoading')
      }
      description={
        context?.offerTitle
          ? t('survey.redeem', { title: context.offerTitle })
          : t('survey.descFallback')
      }
      footer={
        phase === 'form' ? (
          <div className="flex w-full items-center justify-between gap-3">
            <span
              className="inline-flex items-center gap-1.5 text-sm tabular-nums text-muted"
              aria-live="polite"
            >
              <Clock className="h-4 w-4" aria-hidden="true" />
              {mm}:{ss}
            </span>
            <Button onClick={handleSubmit} loading={submitting} disabled={!complete}>
              {t('survey.submit')}
            </Button>
          </div>
        ) : undefined
      }
    >
      {phase === 'loading' || !context ? (
        <div className="space-y-4" aria-live="polite">
          <p className="text-sm text-muted">{t('survey.preparing')}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {fieldErrors._form && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-evs-1">
              {fieldErrors._form}
            </p>
          )}

          {activeDims.map((key) => {
            const meta = DIMENSION_META[key];
            const Icon = ICONS[meta.iconName] ?? BadgeCheck;
            const err = fieldErrors[key];
            const current = (values[key] as number | null) ?? 0;
            const label = t(DIMENSION_LABEL_KEY[key]);
            return (
              <div key={key} className="border-b border-slate-100 pb-4 last:border-0">
                <div className="mb-1 flex items-center gap-2">
                  <Icon className="h-5 w-5 text-brand-500" aria-hidden="true" />
                  <span className="font-semibold text-slate-900">{label}</span>
                </div>
                <p className="mb-2 text-sm text-muted">{t(DIMENSION_HELP_KEY[key])}</p>
                <StarRating
                  value={current}
                  onChange={(v) => setScore(key, v)}
                  label={label}
                />
                {err && (
                  <p role="alert" className="mt-1 text-sm text-evs-1">
                    {t(err)}
                  </p>
                )}
              </div>
            );
          })}

          <div>
            <label htmlFor="survey-comment" className="mb-1 block font-semibold text-slate-900">
              {t('survey.commentLabel')}
            </label>
            <textarea
              id="survey-comment"
              value={values.comments}
              maxLength={MAX_COMMENT}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, comments: e.target.value }))
              }
              rows={3}
              className="w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              placeholder={t('survey.commentPlaceholder')}
            />
            <p className="mt-1 text-right text-xs text-muted">
              {values.comments.length}/{MAX_COMMENT}
            </p>
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={values.is_anonymous}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, is_anonymous: e.target.checked }))
              }
              className="h-5 w-5 rounded border-slate-300 text-brand-500 focus-visible:ring-brand-500"
            />
            <span className="text-sm text-slate-700">
              {t('survey.anonymous')}
            </span>
          </label>
        </div>
      )}
    </Modal>
  );
}
