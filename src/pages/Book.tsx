/**
 * Book — página pública de reserva directa (/reservar/:memberNo).
 *
 * Diseñada para embeberse por iframe en la web/redes del prestador. NO usa el
 * marco de la app (sin navegación): un visitante (incluso sin cuenta) envía una
 * solicitud de reserva que se guarda y notifica al prestador. Enlaza la RPC
 * pública request_booking. Respeta los 8 idiomas.
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarClock, Check, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const inputCls =
  'w-full rounded-xl border border-slate-300 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

export function Book() {
  const { t } = useTranslation();
  const { memberNo: raw } = useParams<{ memberNo: string }>();
  const memberNo = useMemo(() => Number((String(raw ?? '').match(/\d+/g) || []).join('')), [raw]);

  const [providerName, setProviderName] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [preferred, setPreferred] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!memberNo) { setNotFound(true); return; }
      const { data } = await supabase.rpc('booking_provider_name' as never, { p_member_no: memberNo } as never);
      if (data) setProviderName(data as unknown as string);
      else setNotFound(true);
    })();
  }, [memberNo]);

  const valid = name.trim().length >= 2 && contact.trim().length >= 3;

  const submit = async () => {
    if (!valid) return;
    setBusy(true); setError(null);
    const { data, error: err } = await supabase.rpc('request_booking' as never, {
      p_provider_member_no: memberNo,
      p_name: name.trim(),
      p_contact: contact.trim(),
      p_preferred: preferred || null,
      p_note: note.trim() || null,
    } as never);
    setBusy(false);
    const res = data as { ok: boolean; error?: string } | null;
    if (err || !res?.ok) { setError(t('book.error')); return; }
    setDone(true);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <img src="/logo-neuromundi.webp" alt="Neuromundi" className="h-8 w-8 rounded-lg" />
          <span className="text-sm font-semibold text-brand-700">Neuromundi</span>
        </div>

        {notFound ? (
          <p className="text-sm text-slate-600">{t('book.notFound')}</p>
        ) : done ? (
          <div className="py-4 text-center">
            <Check className="mx-auto h-10 w-10 text-sage-600" aria-hidden="true" />
            <h1 className="mt-2 text-lg font-extrabold text-slate-900">{t('book.sentTitle')}</h1>
            <p className="mt-1 text-sm text-slate-600">{t('book.sentBody')}</p>
          </div>
        ) : (
          <>
            <h1 className="flex items-center gap-2 text-xl font-extrabold text-slate-900">
              <CalendarClock className="h-5 w-5 text-brand-600" aria-hidden="true" />
              {t('book.title')}
            </h1>
            {providerName && <p className="mt-1 text-sm text-muted">{t('book.with', { name: providerName })}</p>}

            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="b-name" className="mb-1 block text-sm font-semibold text-slate-700">{t('book.name')}</label>
                <input id="b-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="b-contact" className="mb-1 block text-sm font-semibold text-slate-700">{t('book.contact')}</label>
                <input id="b-contact" className={inputCls} placeholder={t('book.contactHint')} value={contact} onChange={(e) => setContact(e.target.value)} />
              </div>
              <div>
                <label htmlFor="b-when" className="mb-1 block text-sm font-semibold text-slate-700">{t('book.preferred')}</label>
                <input id="b-when" type="datetime-local" className={inputCls} value={preferred} onChange={(e) => setPreferred(e.target.value)} />
              </div>
              <div>
                <label htmlFor="b-note" className="mb-1 block text-sm font-semibold text-slate-700">{t('book.note')}</label>
                <textarea id="b-note" rows={3} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>

              {error && <p role="alert" className="text-sm text-evs-1">{error}</p>}

              <button
                type="button"
                disabled={!valid || busy}
                onClick={submit}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3 font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
              >
                <Send className="h-4 w-4" aria-hidden="true" /> {busy ? t('book.sending') : t('book.send')}
              </button>
              <p className="text-center text-xs text-muted">{t('book.disclaimer')}</p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
