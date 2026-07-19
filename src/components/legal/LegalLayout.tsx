/**
 * LegalLayout — envoltorio común para las páginas legales (Términos, Privacidad).
 * Muestra título, fecha de actualización, un aviso de "plantilla base" y el
 * cuerpo. Pensado para ser reemplazado por el texto legal definitivo.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LegalLayoutProps {
  title: string;
  /** Fecha en formato libre, p. ej. "17 de junio de 2026". */
  updated: string;
  children: ReactNode;
}

export function LegalLayout({ title, updated, children }: LegalLayoutProps) {
  const { t } = useTranslation();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <Link
        to="/entrar"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('common.back')}
      </Link>

      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-1 text-sm text-muted">
        {t('legal.lastUpdated')}: {updated}
      </p>

      <article className="legal-body mt-4 space-y-5 text-slate-700">{children}</article>
    </main>
  );
}

/** Sección legal con encabezado numerado. */
export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-slate-900">{heading}</h2>
      {children}
    </section>
  );
}
