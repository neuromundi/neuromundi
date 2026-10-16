/**
 * SolicitarContactoButton — una familia le pide contacto a un prestador del
 * directorio con una presentación corta.
 *
 * No es un mensaje abierto a propósito: el prestador acepta o no, y sólo
 * entonces se abre el hilo. (Decisión de Enyoria, 16 oct 2026.)
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';
import { Button, Modal, useToast } from '@/components/ui';
import { solicitarContacto, claveDeMotivo } from '@/hooks/useSolicitudesContacto';

const MIN = 10;
const MAX = 600;

export function SolicitarContactoButton({ memberNo }: { memberNo: number }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [abierto, setAbierto] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);

  const largo = mensaje.trim().length;
  const puede = largo >= MIN && largo <= MAX && !enviando;

  const enviar = async () => {
    setEnviando(true);
    const r = await solicitarContacto(memberNo, mensaje.trim());
    setEnviando(false);
    if (!r.ok) { toast.error(t(claveDeMotivo(r.motivo))); return; }
    setEnviada(true);
    setAbierto(false);
    setMensaje('');
    toast.success(t('contacto.enviada'));
  };

  return (
    <>
      <Button
        variant="secondary"
        leadingIcon={<Send className="h-4 w-4" />}
        onClick={() => setAbierto(true)}
        disabled={enviada}
      >
        {t(enviada ? 'contacto.yaEnviada' : 'contacto.boton')}
      </Button>

      <Modal
        open={abierto}
        onClose={() => setAbierto(false)}
        title={t('contacto.titulo')}
        description={t('contacto.ayuda')}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setAbierto(false)}>{t('common.cancel')}</Button>
            <Button loading={enviando} disabled={!puede} onClick={() => void enviar()}>
              {t('contacto.enviar')}
            </Button>
          </div>
        }
      >
        <label className="mb-1 block font-semibold text-slate-900" htmlFor="contacto-msg">
          {t('contacto.etiqueta')}
        </label>
        <textarea
          id="contacto-msg"
          rows={5}
          maxLength={MAX}
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          placeholder={t('contacto.ejemplo')}
          className="w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        />
        <p className="mt-1 text-xs text-muted">
          {t('contacto.contador', { n: largo, max: MAX })}
        </p>
      </Modal>
    </>
  );
}
