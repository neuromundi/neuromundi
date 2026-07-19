/**
 * AppointmentRequests — solicitudes de cita en el calendario.
 *
 * - Destinatario (paciente/tutor): ve las solicitudes pendientes y las acepta
 *   (se agenda en su calendario) o las rechaza indicando el motivo.
 * - Especialista (prestador): localiza al paciente por folio, nombre/apellido,
 *   consentimiento o recetas previas, envía la solicitud y ve el estado
 *   (aceptada / rechazada + motivo).
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarClock, Send, Check, X, UserRound, Search } from 'lucide-react';
import { Button, Modal, useToast, Avatar } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import {
  useAppointmentRequests,
  type AppointmentRequest,
  type RequestPayload,
  type PatientHit,
} from '@/hooks/useAppointmentRequests';

const inputCls =
  'w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

function fmt(iso: string, lang: string) {
  return new Date(iso).toLocaleString(lang, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function AppointmentRequests() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { isProvider } = useAuth();
  const { sent, pendingReceived, busy, sendRequest, respond, searchPatients } = useAppointmentRequests();
  const [sendOpen, setSendOpen] = useState(false);
  const [rejecting, setRejecting] = useState<AppointmentRequest | null>(null);
  const [reason, setReason] = useState('');

  const errMsg = (code: string) => {
    const known = ['recipient_not_found', 'not_provider', 'self', 'invalid', 'already', 'forbidden'];
    return known.includes(code) ? t(`appt.err.${code}`) : code;
  };

  const onAccept = async (r: AppointmentRequest) => {
    const res = await respond(r.id, true);
    toast[res.ok ? 'success' : 'error'](res.ok ? t('appt.acceptedToast') : errMsg(res.error));
  };
  const onReject = async () => {
    if (!rejecting) return;
    const res = await respond(rejecting.id, false, reason.trim() || undefined);
    if (res.ok) { toast.success(t('appt.rejectedToast')); setRejecting(null); setReason(''); }
    else toast.error(errMsg(res.error));
  };

  const hasContent = pendingReceived.length > 0 || isProvider;
  if (!hasContent) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold text-slate-900">
          <CalendarClock className="h-5 w-5 text-brand-600" aria-hidden="true" /> {t('appt.title')}
        </h2>
        {isProvider && (
          <Button size="sm" onClick={() => setSendOpen(true)} leadingIcon={<Send className="h-4 w-4" />}>{t('appt.request')}</Button>
        )}
      </div>

      {/* Pendientes por responder (destinatario) */}
      {pendingReceived.length > 0 && (
        <ul className="space-y-2">
          {pendingReceived.map((r) => (
            <li key={r.id} className="rounded-xl border border-slate-100 bg-white p-3">
              <p className="text-sm font-semibold text-slate-900">{r.title}</p>
              <p className="text-xs text-muted">
                <UserRound className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                {r.otherName || t('appt.specialist')} · {fmt(r.starts_at, i18n.language)}
              </p>
              {r.location && <p className="text-xs text-slate-600">{r.location}</p>}
              {r.note && <p className="mt-1 text-sm text-slate-600">{r.note}</p>}
              <div className="mt-2 flex gap-2">
                <Button size="sm" loading={busy} onClick={() => onAccept(r)} leadingIcon={<Check className="h-4 w-4" />}>{t('appt.accept')}</Button>
                <Button size="sm" variant="ghost" onClick={() => { setRejecting(r); setReason(''); }} leadingIcon={<X className="h-4 w-4" />}>{t('appt.reject')}</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Estado de las solicitudes enviadas (especialista) */}
      {isProvider && sent.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t('appt.sent')}</p>
          <ul className="space-y-2">
            {sent.map((r) => (
              <li key={r.id} className="rounded-xl border border-slate-100 bg-white p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{r.title}</span>
                  <span className={
                    r.status === 'accepted' ? 'rounded-full bg-sage-50 px-2 py-0.5 text-xs font-semibold text-sage-700'
                    : r.status === 'rejected' ? 'rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700'
                    : 'rounded-full bg-warm-100 px-2 py-0.5 text-xs font-semibold text-warm-800'
                  }>{t(`appt.status.${r.status}`)}</span>
                </div>
                <p className="text-xs text-muted">{r.otherName} · {fmt(r.starts_at, i18n.language)}</p>
                {r.status === 'rejected' && r.rejection_reason && (
                  <p className="mt-1 rounded-lg bg-red-50 p-2 text-xs text-red-800">{t('appt.reasonLabel')}: {r.rejection_reason}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {sendOpen && <SendModal busy={busy} searchPatients={searchPatients} onClose={() => setSendOpen(false)} onSend={async (memberNo, payload) => {
        const res = await sendRequest(memberNo, payload);
        if (res.ok) { toast.success(t('appt.sentToast')); setSendOpen(false); }
        else toast.error(errMsg(res.error));
      }} />}

      {rejecting && (
        <Modal open onClose={() => setRejecting(null)} title={t('appt.rejectTitle')}>
          <p className="text-sm text-slate-600">{t('appt.rejectAsk')}</p>
          <textarea rows={3} className={`mt-2 ${inputCls}`} placeholder={t('appt.reasonPlaceholder')} value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRejecting(null)}>{t('common.cancel')}</Button>
            <Button variant="danger" loading={busy} onClick={onReject}>{t('appt.reject')}</Button>
          </div>
        </Modal>
      )}
    </section>
  );
}

function SendModal({
  busy,
  searchPatients,
  onClose,
  onSend,
}: {
  busy: boolean;
  searchPatients: (q: string) => Promise<PatientHit[]>;
  onClose: () => void;
  onSend: (memberNo: number, payload: RequestPayload) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const [folio, setFolio] = useState('');
  const [title, setTitle] = useState('');
  const [starts, setStarts] = useState('');
  const [ends, setEnds] = useState('');
  const [location, setLocation] = useState('');
  const [onlineUrl, setOnlineUrl] = useState('');
  const [note, setNote] = useState('');

  // Búsqueda con pequeño retardo (debounce).
  useEffect(() => {
    let active = true;
    const q = query.trim();
    setSearching(true);
    const id = setTimeout(async () => {
      const hits = await searchPatients(q);
      if (active) { setResults(hits); setSearching(false); }
    }, 300);
    return () => { active = false; clearTimeout(id); };
  }, [query, searchPatients]);

  const pick = (h: PatientHit) => {
    setFolio(String(h.member_no));
    setSelectedName(h.full_name);
    setResults([]);
    setQuery('');
  };

  const memberNo = Number((folio.match(/\d+/g) || []).join(''));
  const valid = memberNo > 0 && title.trim() && starts;

  const submit = async () => {
    if (!valid) return;
    await onSend(memberNo, {
      title: title.trim(),
      starts_at: new Date(starts).toISOString(),
      ends_at: ends ? new Date(ends).toISOString() : null,
      location: location.trim() || null,
      online_url: onlineUrl.trim() || null,
      note: note.trim() || null,
    });
  };

  return (
    <Modal open onClose={onClose} title={t('appt.request')}>
      <div className="space-y-3">
        {/* Buscador de paciente */}
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">{t('appt.searchLabel')}</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              className={`${inputCls} pl-11`}
              placeholder={t('appt.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <p className="mt-1 text-xs text-muted">{t('appt.searchHint')}</p>
          {(query.trim() !== '' || results.length > 0) && (
            <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-slate-100">
              {searching ? (
                <p className="p-3 text-sm text-muted">{t('common.loading')}</p>
              ) : results.length === 0 ? (
                <p className="p-3 text-sm text-muted">{t('appt.noResults')}</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {results.map((h) => (
                    <li key={h.member_no}>
                      <button type="button" onClick={() => pick(h)} className="flex w-full items-center gap-3 p-2.5 text-left hover:bg-brand-50">
                        <Avatar name={h.full_name} src={h.avatar_url} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900">{h.full_name}</span>
                          <span className="text-xs text-muted">NM-{String(h.member_no).padStart(6, '0')} · {t(`appt.rel.${h.relation}`)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Folio (autocompletado por la selección, o manual) */}
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">{t('appt.folio')}</label>
          <input className={inputCls} placeholder="NM-000123" value={folio} onChange={(e) => { setFolio(e.target.value); setSelectedName(''); }} />
          {selectedName && <p className="mt-1 text-xs font-medium text-sage-700">{t('appt.selectedLabel')}: {selectedName}</p>}
        </div>

        <input className={inputCls} placeholder={t('appt.fTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
        <label className="block text-sm font-semibold text-slate-700">{t('appt.fStarts')}
          <input type="datetime-local" className={inputCls} value={starts} onChange={(e) => setStarts(e.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">{t('appt.fEnds')}
          <input type="datetime-local" className={inputCls} value={ends} onChange={(e) => setEnds(e.target.value)} />
        </label>
        <input className={inputCls} placeholder={t('appt.fLocation')} value={location} onChange={(e) => setLocation(e.target.value)} />
        <input className={inputCls} placeholder={t('appt.fOnline')} value={onlineUrl} onChange={(e) => setOnlineUrl(e.target.value)} />
        <textarea rows={2} className={inputCls} placeholder={t('appt.fNote')} value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button loading={busy} disabled={!valid} onClick={submit} leadingIcon={<Send className="h-4 w-4" />}>{t('appt.send')}</Button>
        </div>
      </div>
    </Modal>
  );
}
