/**
 * SocialLinks — enlaces a los perfiles oficiales de Neuromundi en redes sociales.
 *
 * Buenas prácticas aplicadas:
 *  - Abren en pestaña nueva con rel="noopener noreferrer" (seguridad).
 *  - aria-label descriptivo por red (los iconos son decorativos → aria-hidden).
 *  - Áreas táctiles ≥44px y foco visible (accesibilidad AA).
 *  - Color de marca al pasar el cursor para reforzar el reconocimiento.
 */
import { Facebook, Instagram, Linkedin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const PROFILES = [
  { key: 'facebook', href: 'https://www.facebook.com/NeuromundiGlobal', Icon: Facebook, hover: 'hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2]' },
  { key: 'instagram', href: 'https://www.instagram.com/neuromundiglobal', Icon: Instagram, hover: 'hover:bg-[#E1306C] hover:text-white hover:border-[#E1306C]' },
  { key: 'linkedin', href: 'https://www.linkedin.com/company/neuromundi', Icon: Linkedin, hover: 'hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2]' },
] as const;

export function SocialLinks({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={cn('flex items-center justify-center gap-3', className)}>
      {PROFILES.map(({ key, href, Icon, hover }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t(`followUs.${key}`)}
          title={t(`followUs.${key}`)}
          className={cn(
            'inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
            hover,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}
