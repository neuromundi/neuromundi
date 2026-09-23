/**
 * Support — página pública de ayuda/soporte al cliente. Ruta principal /support
 * (alias /soporte). Se usa como "URL de soporte" en Stripe (correos/recibos a
 * clientes) y como destino del pie. Muestra correo de contacto, WhatsApp (si está
 * configurado en la campaña) y guía al botón flotante para reportar incidencias.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LifeBuoy, Mail, MessageCircle } from 'lucide-react';
import { useCampaign } from '@/hooks/useCampaign';

const SUPPORT_EMAIL = 'admin@neuromundi.com';

export function Support() {
  const { t } = useTranslation();
  const { config } = useCampaign();
  const whatsapp = config?.whatsapp_url ?? null;
  const [copied, setCopied] = useState(false);

  // El clic intenta abrir el cliente de correo (mailto:) y, como respaldo para
  // quien no tenga uno configurado, copia la dirección al portapapeles con
  // confirmación visible. Así el botón SIEMPRE hace algo útil.
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* si el navegador bloquea el portapapeles, el mailto ya intentó abrir */
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center gap-2 text-brand-700">
        <LifeBuoy className="h-6 w-6" aria-hidden="true" />
        <h1 className="text-3xl font-extrabold text-slate-900">{t('support.pageTitle')}</h1>
      </div>
      <p className="mt-3 text-muted">{t('support.pageIntro')}</p>

      <div className="mt-6 space-y-3">
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          onClick={copyEmail}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-sm"
        >
          <Mail className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
          <span>
            <span className="block font-semibold text-slate-900">{t('support.emailCta')}</span>
            <span className="text-sm text-muted">
              {SUPPORT_EMAIL}
              {copied && (
                <span className="ml-2 font-semibold text-green-600">{t('support.copied')}</span>
              )}
            </span>
          </span>
        </a>

        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-sm"
          >
            <MessageCircle className="h-5 w-5 shrink-0 text-[#0b8043]" aria-hidden="true" />
            <span className="font-semibold text-slate-900">{t('footer.whatsappChannel')}</span>
          </a>
        )}
      </div>

      <p className="mt-6 text-sm text-muted">{t('support.reportNote')}</p>
    </div>
  );
}
