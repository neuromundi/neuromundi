/**
 * EmpresaLimitadaMuro — lo que ve una empresa limitada en lugar de la
 * mensajería o de Academy.
 *
 * Deliberadamente no es una pared: explica el porqué, dice el remedio exacto
 * y lleva al sitio donde se resuelve en un clic. Nadie pierde datos ni cuenta,
 * y no hay ningún cargo de por medio.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import { Button } from '@/components/ui';

export function EmpresaLimitadaMuro() {
  const { t } = useTranslation();
  return (
    <main className="mx-auto max-w-xl p-4">
      <section className="rounded-3xl border-2 border-amber-300 bg-amber-50 p-6 text-center">
        <Briefcase className="mx-auto h-10 w-10 text-amber-600" aria-hidden="true" />
        <h1 className="mt-3 text-lg font-bold text-amber-900">{t('empresaPlazo.muroTitulo')}</h1>
        <p className="mt-2 text-sm text-amber-900">{t('empresaPlazo.muroCuerpo')}</p>
        <p className="mt-2 text-xs text-slate-700">{t('empresaPlazo.muroNota')}</p>
        <Link to="/panel" className="mt-4 inline-block">
          <Button>{t('empresaPlazo.muroCta')}</Button>
        </Link>
      </section>
    </main>
  );
}
