/**
 * Terms — Términos y Condiciones. Ruta pública: /terminos.
 * El contenido se toma de legalContent según el idioma activo (navegador o
 * selector), por lo que cambia de idioma como el resto de la plataforma.
 */
import { useTranslation } from 'react-i18next';
import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout';
import { legalContent } from '@/data/legalContent';

export function Terms() {
  const { t, i18n } = useTranslation();
  const doc = legalContent(i18n.language);

  return (
    <LegalLayout title={t('auth.terms')} updated={doc.updated}>
      {doc.terms.intro.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      {doc.terms.sections.map((s, i) => (
        <LegalSection key={i} heading={s.h}>
          {s.p?.map((p, j) => <p key={j}>{p}</p>)}
          {s.li && (
            <ul className="list-disc space-y-1 pl-5">
              {s.li.map((li, k) => <li key={k}>{li}</li>)}
            </ul>
          )}
        </LegalSection>
      ))}
    </LegalLayout>
  );
}
