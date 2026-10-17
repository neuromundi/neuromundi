/**
 * MuroDeAliadosCard — la organización que ya reclamó su ficha propone su alta
 * en el muro de Aliados. (Migración 0255.)
 *
 * No se muestra el formulario a quien no puede usarlo: si la base responde que
 * no hay ficha reclamada, la tarjeta lo explica en vez de dejar que el botón
 * falle.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Handshake, Clock, Check, X } from 'lucide-react';
import { Button, SkeletonCard, AvisoDeFallo } from '@/components/ui';
import { useAliado } from '@/hooks/useAliado';
import { useAvisarResultado } from '@/hooks/useAvisarResultado';

const inputCls =
  'w-full rounded-xl border border-slate-200 p-3 text-base ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
const labelCls = 'mb-1 block text-sm font-semibold text-slate-900';

export function MuroDeAliadosCard() {
  const { t } = useTranslation();
  const { items, viva, publicada, loading, fallo, reload, proponer } = useAliado();
  const avisar = useAvisarResultado();

  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [logo, setLogo] = useState('');

  if (loading) return <SkeletonCard rows={1} />;
  if (fallo) return <AvisoDeFallo onRetry={() => void reload()} />;

  const rechazada = items.find((x) => x.estado === 'rechazado') ?? null;

  const enviar = async () => {
    setEnviando(true);
    const ok = await avisar(
      proponer({ name, website: website || null, logo_url: logo || null }, (c) => t(c)),
      t('aliados.enviada'),
    );
    setEnviando(false);
    if (ok) { setName(''); setWebsite(''); setLogo(''); setAbierto(false); }
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <Handshake className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{t('aliados.titulo')}</p>
          <p className="mt-1 text-sm text-muted">{t('aliados.ayuda')}</p>

          {publicada && (
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-sage-700">
              <Check className="h-4 w-4" aria-hidden="true" /> {t('aliados.publicada', { nombre: publicada.name })}
            </p>
          )}

          {viva && (
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-warm-700">
              <Clock className="h-4 w-4" aria-hidden="true" /> {t('aliados.enRevision', { nombre: viva.name })}
            </p>
          )}

          {!viva && !publicada && rechazada && (
            <div className="mt-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <X className="h-4 w-4" aria-hidden="true" /> {t('aliados.noProcedio')}
              </p>
              {rechazada.nota_admin && (
                <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">{rechazada.nota_admin}</p>
              )}
            </div>
          )}

          {!viva && !publicada && !abierto && (
            <div className="mt-3">
              <Button size="sm" onClick={() => setAbierto(true)} leadingIcon={<Handshake className="h-4 w-4" />}>
                {t('aliados.proponer')}
              </Button>
            </div>
          )}

          {abierto && !viva && !publicada && (
            <div className="mt-3 space-y-3">
              <div>
                <label htmlFor="al-name" className={labelCls}>{t('aliados.fNombre')}</label>
                <input id="al-name" className={inputCls} value={name} maxLength={120}
                  onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="al-web" className={labelCls}>{t('aliados.fSitio')}</label>
                <input id="al-web" className={inputCls} value={website} maxLength={300} inputMode="url"
                  placeholder="https://" onChange={(e) => setWebsite(e.target.value)} />
              </div>
              <div>
                <label htmlFor="al-logo" className={labelCls}>{t('aliados.fLogo')}</label>
                <input id="al-logo" className={inputCls} value={logo} maxLength={500} inputMode="url"
                  placeholder="https://" onChange={(e) => setLogo(e.target.value)} />
                <p className="mt-1 text-xs text-muted">{t('aliados.logoAyuda')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button loading={enviando} onClick={() => void enviar()}>{t('aliados.enviar')}</Button>
                <Button variant="secondary" onClick={() => setAbierto(false)}>{t('common.cancel')}</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
