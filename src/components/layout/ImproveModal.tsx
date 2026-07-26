/**
 * ImproveModal — formulario "Ayúdanos a mejorar", abierto al público general
 * (no hace falta cuenta). Recoge un mensaje y, opcionalmente, un correo de
 * contacto. Guarda la ruta actual como contexto. Tras enviar, agradece.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lightbulb } from 'lucide-react';
import { Button, Modal, useToast } from '@/components/ui';
import { useSubmitImprovement } from '@/hooks/useImprovements';

export function ImproveModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { busy, submit } = useSubmitImprovement();
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const inputCls =
    'w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

  const handleSubmit = async () => {
    if (message.trim().length === 0) return;
    const page = typeof window !== 'undefined' ? window.location.pathname : null;
    const res = await submit(message.trim(), email.trim() || null, page);
    if (!res.ok) {
      toast.error(res.error ?? t('common.errorGeneric'));
      return;
    }
    setSent(true);
  };

  return (
    <Modal open onClose={onClose} title={t('improve.title')}>
      {sent ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <Lightbulb className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="text-slate-700">{t('improve.thanks')}</p>
          <Button variant="primary" fullWidth onClick={onClose}>{t('common.close')}</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted">{t('improve.help')}</p>
          <div>
            <label htmlFor="improve-msg" className="mb-1 block font-semibold text-slate-900">{t('improve.messageLabel')}</label>
            <textarea
              id="improve-msg"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('improve.messagePlaceholder')}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="improve-email" className="mb-1 block font-semibold text-slate-900">{t('improve.emailLabel')}</label>
            <input
              id="improve-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('improve.emailPlaceholder')}
              className={inputCls}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
            <Button variant="primary" loading={busy} disabled={message.trim().length === 0} onClick={handleSubmit}>
              {t('improve.send')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
