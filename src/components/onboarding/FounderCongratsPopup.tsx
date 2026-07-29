/**
 * FounderCongratsPopup — felicitación al obtener el distintivo de Miembro
 * Fundador. Explica que el distintivo es condicional: hay 3 meses para cumplir
 * los requisitos objetivos del perfil o se retira (cron `purge_lapsed_founders`).
 * Se muestra una sola vez, justo tras reclamar el cupo (useFounderAutoClaim).
 */
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PartyPopper, Award } from 'lucide-react';
import { Button } from '@/components/ui';

export function FounderCongratsPopup({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return createPortal(
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-900/60 p-4 motion-safe:animate-fade"
      role="dialog"
      aria-modal="true"
      aria-labelledby="founder-congrats-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-brand-600 via-brand-500 to-brand-700 px-6 py-6 text-center text-white">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/40">
            <Award className="h-8 w-8" aria-hidden="true" />
          </span>
          <h2 id="founder-congrats-title" className="mt-3 flex items-center justify-center gap-2 text-xl font-extrabold">
            <PartyPopper className="h-5 w-5" aria-hidden="true" /> {t('founderCongrats.title')}
          </h2>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm leading-relaxed text-slate-700">{t('founderCongrats.body')}</p>
          <div className="mt-5 flex flex-col gap-2">
            <Button onClick={() => { onClose(); navigate('/ajustes'); }} fullWidth>
              {t('founderCongrats.reqs')}
            </Button>
            <button type="button" onClick={onClose} className="text-sm font-semibold text-muted hover:underline">
              {t('founderCongrats.ok')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
