/**
 * Rules — Reglamento de participación por tipo de usuario + Descargo de
 * responsabilidad (plantilla base, editable; revisar con abogado).
 * Ruta pública: /reglamento
 */
import { useTranslation } from 'react-i18next';
import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout';
import { RULES_VERSION } from '@/lib/legal';

export function Rules() {
  const { t } = useTranslation();

  const list = (key: string) => {
    const items = t(key, { returnObjects: true }) as unknown;
    return Array.isArray(items) ? (items as string[]) : [];
  };

  const Block = ({ heading, intro, bullets }: { heading: string; intro: string; bullets: string }) => (
    <LegalSection heading={heading}>
      <p>{intro}</p>
      <ul className="list-disc space-y-1 pl-5">
        {list(bullets).map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </LegalSection>
  );

  return (
    <LegalLayout title={t('rules.title')} updated={`${t('rules.version')} ${RULES_VERSION}`}>
      <p>{t('rules.intro')}</p>

      <Block heading={t('rules.patientTitle')} intro={t('rules.patientIntro')} bullets="rules.patientRules" />
      <Block heading={t('rules.parentTitle')} intro={t('rules.parentIntro')} bullets="rules.parentRules" />
      <Block heading={t('rules.serviceTitle')} intro={t('rules.serviceIntro')} bullets="rules.serviceRules" />
      <Block heading={t('rules.merchantTitle')} intro={t('rules.merchantIntro')} bullets="rules.merchantRules" />

      <LegalSection heading={t('rules.disclaimerTitle')}>
        <p>{t('rules.disclaimerBody')}</p>
        <ul className="list-disc space-y-1 pl-5">
          {list('rules.disclaimerPoints').map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
        <p className="font-semibold text-slate-900">{t('rules.acceptanceNote')}</p>
      </LegalSection>
    </LegalLayout>
  );
}
