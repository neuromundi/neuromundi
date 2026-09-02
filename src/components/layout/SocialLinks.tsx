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

/** lucide-react no incluye el glifo de WhatsApp; se define localmente. */
function WhatsAppIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.81L2 22l5.42-1.42a9.87 9.87 0 0 0 4.62 1.18h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.86 14.05c-.25.7-1.23 1.29-1.98 1.44-.53.11-1.22.2-3.55-.76-2.97-1.23-4.88-4.24-5.03-4.44-.15-.2-1.2-1.6-1.2-3.05 0-1.45.75-2.16 1.02-2.46.27-.3.58-.37.78-.37.2 0 .4 0 .57.01.18.01.43-.07.67.51.25.6.85 2.06.92 2.21.07.15.12.33.02.53-.1.2-.15.32-.3.5-.15.17-.31.39-.44.52-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.36 1.46.3.15.47.13.65-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.28.1 1.75.82 2.05.97.3.15.5.22.57.35.07.13.07.75-.18 1.45z" />
    </svg>
  );
}

const PROFILES = [
  { key: 'facebook', href: 'https://www.facebook.com/NeuromundiGlobal', Icon: Facebook, hover: 'hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2]' },
  { key: 'instagram', href: 'https://www.instagram.com/neuromundiglobal', Icon: Instagram, hover: 'hover:bg-[#E1306C] hover:text-white hover:border-[#E1306C]' },
  { key: 'linkedin', href: 'https://www.linkedin.com/company/neuromundi', Icon: Linkedin, hover: 'hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2]' },
  { key: 'whatsapp', href: 'https://whatsapp.com/channel/0029Vb8bXLaADTOEupykD03Q', Icon: WhatsAppIcon, hover: 'hover:bg-[#25D366] hover:text-white hover:border-[#25D366]' },
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
