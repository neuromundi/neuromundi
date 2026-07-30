/**
 * ProviderReviewModal — reseña DIRECTA de un prestador por un consumidor con
 * relación previa (cita/pedido/canje). Reutiliza el mismo formulario EVS del
 * SurveyModal (dimensiones + estrellas + comentario + anónimo), pero es
 * cancelable y envía por submit_provider_review (sin transacción de descuento).
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, Heart, Accessibility, Tag, Handshake, Waves, LifeBuoy, Building2, GraduationCap, PartyPopper, type LucideIcon } from 'lucide-react';
import { Modal, Button, StarRating } from '@/components/ui';
import { useProviderReview } from '@/hooks/useProviderReview';
import { makeSurveySchema, emptySurveyValues, isSurveyComplete, type SurveyFormValues } from '@/lib/schemas';
import { DIMENSION_META, DIMENSION_LABEL_KEY, DIMENSION_HELP_KEY, dimensionsForProviderType, type SurveyDimension, type ProviderType } from '@/types/app';

const ICONS: Record<string, LucideIcon> = { BadgeCheck, Heart, Accessibility, Tag, Handshake, Waves, LifeBuoy, Building2, GraduationCap };
const MAX_COMMENT = 500;

export function ProviderReviewModal({
  providerId, providerName, providerType, onClose, onCompleted,
}: {
  providerId: string;
  providerName: string;
  providerType: ProviderType | null;
  onClose: () => void;
  onCompleted?: () => void;
}) {
  const { t } = useTranslation();
  const { submit } = useProviderReview(providerId);
  const [values, setValues] = useState<SurveyFormValues>(emptySurveyValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const activeDims = useMemo(() => dimensionsForProviderType(providerType), [providerType]);
  const complete = isSurveyComplete(values, providerType);

  const setScore = (key: SurveyDimension, v: number) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async () => {
    const parsed = makeSurveySchema(providerType).safeParse(values);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0];
        if (typeof k === 'string' && !errs[k]) errs[k] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }
    setBusy(true);
    const res = await submit(values, providerType);
    setBusy(false);
    if (res.ok) { setDone(true); onCompleted?.(); }
    else setFieldErrors({ _form: res.error ?? 'survey.errorBody' });
  };

  if (done) {
    return (
      <Modal open onClose={onClose} title={t('survey.thanksTitle')} footer={<Button onClick={onClose}>{t('survey.thanksOk')}</Button>}>
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <PartyPopper className="h-12 w-12 text-warm-500" aria-hidden="true" />
          <p className="text-slate-700">{t('survey.thanksBody')}</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('review.title', { name: providerName })}
      description={t('review.desc')}
      footer={
        <Button onClick={handleSubmit} loading={busy} disabled={!complete}>{t('survey.submit')}</Button>
      }
    >
      <div className="space-y-5">
        {fieldErrors._form && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-evs-1">{fieldErrors._form}</p>
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
              <StarRating value={current} onChange={(v) => setScore(key, v)} label={label} />
              {err && <p role="alert" className="mt-1 text-sm text-evs-1">{t(err)}</p>}
            </div>
          );
        })}

        <div>
          <label htmlFor="review-comment" className="mb-1 block font-semibold text-slate-900">{t('survey.commentLabel')}</label>
          <textarea
            id="review-comment"
            value={values.comments}
            maxLength={MAX_COMMENT}
            onChange={(e) => setValues((prev) => ({ ...prev, comments: e.target.value }))}
            rows={3}
            className="w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            placeholder={t('survey.commentPlaceholder')}
          />
          <p className="mt-1 text-right text-xs text-muted">{values.comments.length}/{MAX_COMMENT}</p>
        </div>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={values.is_anonymous}
            onChange={(e) => setValues((prev) => ({ ...prev, is_anonymous: e.target.checked }))}
            className="h-5 w-5 rounded border-slate-300 text-brand-500 focus-visible:ring-brand-500"
          />
          <span className="text-sm text-slate-700">{t('survey.anonymous')}</span>
        </label>
      </div>
    </Modal>
  );
}
