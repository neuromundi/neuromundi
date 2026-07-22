/**
 * SupportButton — botón flotante presente en toda la app para solicitar soporte
 * técnico o reportar fallas. Compone un correo dirigido a admin@neuromundi.com con
 * el tipo de solicitud y el mensaje, y abre la app de correo del usuario.
 *
 * Nota: el envío usa `mailto:` (abre el cliente de correo). Para un envío 100%
 * automatizado del lado del servidor se necesitaría una Edge Function + proveedor
 * de correo; este enfoque no requiere backend adicional.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LifeBuoy } from 'lucide-react';
import { Modal, Button, useToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { currentLocale } from '@/i18n';

const SUPPORT_EMAIL = 'admin@neuromundi.com';

const inputCls =
  'w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
const labelCls = 'mb-1 block font-semibold text-slate-900';

export function SupportButton() {
  const { t } = useTranslation();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('bug');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const categoryLabel = (c: string) =>
    c === 'bug' ? t('support.catBug') : c === 'question' ? t('support.catQuestion') : t('support.catOther');

  // Respaldo: si el envío server-side falla, abrimos el cliente de correo.
  const mailtoFallback = () => {
    const subject = `[Soporte Neuromundi] ${categoryLabel(category)}`;
    const body = [
      `${t('support.category')}: ${categoryLabel(category)}`,
      '',
      message.trim(),
      '',
      '—',
      `URL: ${window.location.href}`,
      `User-Agent: ${navigator.userAgent}`,
    ].join('\n');
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const send = async () => {
    if (message.trim() === '') {
      toast.error(t('support.emptyMsg'));
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-support', {
        body: {
          category,
          message: message.trim(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          locale: currentLocale(),
        },
      });
      if (error) throw error;
      toast.success(t('support.sent'));
      setOpen(false);
      setMessage('');
    } catch {
      // El envío automatizado falló: avisamos y caemos al cliente de correo.
      toast.error(t('support.error'));
      mailtoFallback();
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('support.button')}
        className="fixed bottom-24 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-brand-700 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 md:bottom-6"
      >
        <LifeBuoy className="h-5 w-5" aria-hidden="true" />
        <span className="hidden sm:inline">{t('support.button')}</span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={t('support.title')} description={t('support.intro')}>
        <div className="space-y-4">
          <div>
            <label htmlFor="support-cat" className={labelCls}>{t('support.category')}</label>
            <select id="support-cat" className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="bug">{t('support.catBug')}</option>
              <option value="question">{t('support.catQuestion')}</option>
              <option value="other">{t('support.catOther')}</option>
            </select>
          </div>
          <div>
            <label htmlFor="support-msg" className={labelCls}>{t('support.message')}</label>
            <textarea
              id="support-msg"
              rows={5}
              className={inputCls}
              placeholder={t('support.messagePlaceholder')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted">{t('support.note')}</p>
          <div className="flex justify-end">
            <Button onClick={send} loading={sending} leadingIcon={<LifeBuoy className="h-4 w-4" />}>
              {sending ? t('support.sending') : t('support.send')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
