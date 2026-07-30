/**
 * JoinTribeModal — inscripción a Tribu Neuromundi. Presenta el logo (según idioma),
 * explica qué es la Tribu y los PASOS para ingresar, muestra la lista concreta de
 * reglas de convivencia (aceptación obligatoria), el "semáforo de energía" y la
 * privacidad por capas. Al aceptar, inscribe al miembro.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, ListChecks } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { useTribeMembership, type TribeEnergy } from '@/hooks/useTribe';
import { EnergyPicker } from './EnergyBadge';

export function tribeLogo(lang: string): string {
  return lang.startsWith('es') ? '/tribu/tribu-es-v2.webp' : '/tribu/tribu-en-v2.webp';
}

export function JoinTribeModal({ onClose, onJoined }: { onClose: () => void; onJoined?: () => void }) {
  const { t, i18n } = useTranslation();
  const { join } = useTribeMembership();
  const rules = (t('tribe.rules', { returnObjects: true }) as string[]) ?? [];
  const [accepted, setAccepted] = useState(false);
  const [energy, setEnergy] = useState<TribeEnergy>('green');
  const [privacy, setPrivacy] = useState({ show_country: true, show_city: true, show_interests: true, show_diagnosis: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!accepted) { setErr(t('tribe.mustAccept')); return; }
    setBusy(true);
    const ok = await join(energy, privacy);
    setBusy(false);
    if (ok) onJoined?.();
    else setErr(t('tribe.joinErr'));
  };

  const toggle = (k: keyof typeof privacy) => setPrivacy((p) => ({ ...p, [k]: !p[k] }));

  const steps = [t('tribe.step1'), t('tribe.step2'), t('tribe.step3'), t('tribe.step4')];

  return (
    <Modal
      open
      onClose={onClose}
      title={t('tribe.joinTitle')}
      footer={<Button onClick={submit} loading={busy} disabled={!accepted}>{t('tribe.joinCta')}</Button>}
    >
      <div className="space-y-5">
        {/* Logo + qué es la Tribu */}
        <div className="text-center">
          <img src={tribeLogo(i18n.language)} alt="Tribu Neuromundi" className="mx-auto h-28 w-auto" />
          <p className="mx-auto mt-3 max-w-md text-sm text-muted">{t('tribe.landing')}</p>
        </div>

        {/* Cómo ingresar: pasos claros */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <ListChecks className="h-4 w-4 text-brand-600" aria-hidden="true" /> {t('tribe.stepsTitle')}
          </h3>
          <ol className="mt-2 space-y-1.5">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* 1. Reglas: listado concreto y visible, con aceptación explícita */}
        <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden="true" /> {t('tribe.rulesTitle')}
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {rules.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>

        {/* 2. Semáforo de energía */}
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-900">{t('tribe.energyTitle')}</p>
          <EnergyPicker value={energy} onChange={setEnergy} />
        </div>

        {/* 3. Privacidad por capas */}
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-900">{t('tribe.privacyTitle')}</p>
          <p className="mb-2 text-xs text-muted">{t('tribe.privacyHint')}</p>
          <div className="space-y-2">
            {(['show_country', 'show_city', 'show_interests', 'show_diagnosis'] as const).map((k) => (
              <label key={k} className="flex items-center gap-3 text-sm text-slate-700">
                <input type="checkbox" checked={privacy[k]} onChange={() => toggle(k)} className="h-5 w-5 rounded border-slate-300 text-brand-500" />
                <span>{t(`tribe.privacy.${k}`)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 4. Aceptación */}
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-5 w-5 rounded border-slate-300 text-brand-500" />
          <span className="font-medium">{t('tribe.acceptRules')}</span>
        </label>

        {err && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-evs-1">{err}</p>}
      </div>
    </Modal>
  );
}
