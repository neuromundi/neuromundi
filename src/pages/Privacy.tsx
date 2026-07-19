/**
 * Privacy — Aviso de Privacidad. Ruta pública: /privacidad.
 * El contenido se toma de legalContent según el idioma activo.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout';
import { legalContent } from '@/data/legalContent';

export function Privacy() {
  const { t, i18n } = useTranslation();
  const doc = legalContent(i18n.language);

  return (
    <LegalLayout title={t('auth.privacy')} updated={doc.updated}>
      {doc.privacy.intro.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      {doc.privacy.sections.map((s, i) => (
        <LegalSection key={i} heading={s.h}>
          {s.p?.map((p, j) => <p key={j}>{p}</p>)}
          {s.li && (
            <ul className="list-disc space-y-1 pl-5">
              {s.li.map((li, k) => <li key={k}>{li}</li>)}
            </ul>
          )}
        </LegalSection>
      ))}
      <p className="mt-3">
        <Link to="/proteccion-datos" className="font-semibold text-brand-700 underline">
          {t('nav.dataProtection')}
        </Link>
      </p>
    </LegalLayout>
  );
}
