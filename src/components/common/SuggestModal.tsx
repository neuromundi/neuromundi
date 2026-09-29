/**
 * SuggestModal — curaduría comunitaria. Cualquiera (con o sin cuenta) puede
 * proponer una nueva CATEGORÍA del directorio, o un PRODUCTO / CATEGORÍA que le
 * gustaría encontrar en la tienda. Son SUGERENCIAS: entran a una cola que el
 * admin revisa y promueve a la taxonomía real (nunca se crean solas).
 *
 * Se envía por la RPC `submit_catalog_suggestion` (SECURITY DEFINER): el user_id
 * lo toma la base de auth.uid() (null si es anónimo), no se confía al cliente.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lightbulb } from 'lucide-react';
import { Button, Modal, useToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type Kind = 'directory_category' | 'store_product' | 'store_category';

export interface SuggestModalProps {
  context: 'directory' | 'store';
  /** Sección activa del directorio (contexto para el admin). */
  section?: string | null;
  /** País activo (segmenta la demanda por país). */
  country?: string | null;
  onClose: () => void;
}

const inputCls =
  'w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

export function SuggestModal({ context, section = null, country = null, onClose }: SuggestModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const { isAuthenticated } = useAuth();

  // En la tienda el usuario elige qué sugiere; en el directorio es fijo.
  const [kind, setKind] = useState<Kind>(context === 'store' ? 'store_product' : 'directory_category');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const title = context === 'store' ? t('suggest.storeTitle') : t('suggest.dirTitle');
  const help = context === 'store' ? t('suggest.storeHelp') : t('suggest.dirHelp');
  const nameLabel =
    kind === 'store_product' ? t('suggest.productNameLabel')
    : kind === 'store_category' ? t('suggest.categoryNameLabel')
    : t('suggest.dirNameLabel');

  const handleSubmit = async () => {
    if (name.trim().length === 0) return;
    setBusy(true);
    const page = typeof window !== 'undefined' ? window.location.pathname : null;
    const { error } = await supabase.rpc('submit_catalog_suggestion', {
      p_kind: kind,
      p_name: name.trim(),
      p_note: note.trim() || null,
      p_section: section,
      p_country: country,
      p_email: email.trim() || null,
      p_page: page,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message || t('common.errorGeneric'));
      return;
    }
    setSent(true);
  };

  return (
    <Modal open onClose={onClose} title={title}>
      {sent ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <Lightbulb className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="text-slate-700">{t('suggest.thanks')}</p>
          <Button variant="primary" fullWidth onClick={onClose}>{t('common.close')}</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted">{help}</p>

          {context === 'store' && (
            <div>
              <span className="mb-1 block font-semibold text-slate-900">{t('suggest.whatLabel')}</span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {([
                  { value: 'store_product', label: t('suggest.kindProduct') },
                  { value: 'store_category', label: t('suggest.kindCategory') },
                ] as const).map((o) => (
                  <label
                    key={o.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm ${
                      kind === o.value ? 'border-brand-400 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="suggest-kind"
                      className="h-4 w-4 text-brand-500"
                      checked={kind === o.value}
                      onChange={() => setKind(o.value)}
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="suggest-name" className="mb-1 block font-semibold text-slate-900">{nameLabel}</label>
            <input
              id="suggest-name"
              value={name}
              maxLength={160}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('suggest.namePlaceholder')}
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="suggest-note" className="mb-1 block font-semibold text-slate-900">{t('suggest.noteLabel')}</label>
            <textarea
              id="suggest-note"
              rows={3}
              value={note}
              maxLength={1000}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('suggest.notePlaceholder')}
              className={inputCls}
            />
          </div>

          {!isAuthenticated && (
            <div>
              <label htmlFor="suggest-email" className="mb-1 block font-semibold text-slate-900">{t('suggest.emailLabel')}</label>
              <input
                id="suggest-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('suggest.emailPlaceholder')}
                className={inputCls}
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
            <Button variant="primary" loading={busy} disabled={name.trim().length === 0} onClick={handleSubmit}>
              {t('suggest.send')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
