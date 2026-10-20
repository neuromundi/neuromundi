/**
 * BookingWidgetPanel — el prestador obtiene su enlace y el código para embeber
 * el widget de reserva directa en su web o redes (iframe /reservar/NM-000123),
 * y ve las solicitudes de reserva recibidas.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link2, Code, Copy, Check, CalendarClock, CheckCircle2, XCircle } from 'lucide-react';
import { Button, useToast, SkeletonCard, AvisoDeFallo } from '@/components/ui';
import { useAvisarResultado } from '@/hooks/useAvisarResultado';
import { useProfile } from '@/hooks/useProfile';
import { usePerfilDeLaSesion } from '@/hooks/usePerfilDeLaSesion';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';

interface BookingRow {
  id: string; name: string; contact: string; preferred: string | null; note: string | null; status: string; created_at: string;
}

export function BookingWidgetPanel() {
  const { t } = useTranslation();
  const toast = useToast();
  const { profile } = useProfile();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  // Un fallo de la consulta NO es un buzón vacío. (Hallazgo A-12.)
  const [fallo, setFallo] = useState(false);
  const { fallo: falloDePerfil, reintentar: reintentarPerfil } = usePerfilDeLaSesion();
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);
  const avisar = useAvisarResultado();

  const folio = profile?.member_no != null ? `NM-${String(profile.member_no).padStart(6, '0')}` : '';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.neuromundi.com';
  const link = folio ? `${origin}/reservar/${folio}` : '';
  const code = link ? `<iframe src="${link}" width="100%" height="640" style="border:0;border-radius:16px" title="Reserva Neuromundi"></iframe>` : '';

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('booking_requests')
      .select('id, name, contact, preferred, note, status, created_at')
      .order('created_at', { ascending: false })
      .limit(30);
    setFallo(!!error);
    setRows(error ? [] : ((data ?? []) as unknown as BookingRow[]));
    setLoading(false);
  }, [profile]);

  /**
   * Marca una solicitud. La política de la base ya permitía actualizar
   * (booking_update_own); lo que faltaba era ofrecerlo en la pantalla: el
   * prestador no distinguía lo pendiente de lo resuelto.
   * (Auditoría 15 oct 2026, hallazgo M-19.)
   */
  const marcar = useCallback(async (id: string, estado: 'atendida' | 'descartada') => {
    const { error } = await supabase.from('booking_requests').update({ status: estado }).eq('id', id);
    if (error) return { ok: false, error: error.message };
    setRows((p) => p.map((r) => (r.id === id ? { ...r, status: estado } : r)));
    return { ok: true };
  }, []);

  useEffect(() => { void load(); }, [load]);

  const copy = async (text: string, which: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which); setTimeout(() => setCopied(null), 1500);
      toast.success(t('widget.copied'));
    } catch { toast.error(t('widget.copyError')); }
  };

  if (!profile) return falloDePerfil ? <AvisoDeFallo onRetry={reintentarPerfil} /> : <SkeletonCard rows={2} />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t('widget.intro')}</p>

      {/* Enlace directo */}
      <div className="rounded-2xl border border-slate-100 p-4">
        <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Link2 className="h-4 w-4 text-brand-600" aria-hidden="true" /> {t('widget.link')}
        </p>
        <div className="flex items-center gap-2">
          <input readOnly value={link} className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm" onFocus={(e) => e.currentTarget.select()} />
          <Button size="sm" variant="secondary" onClick={() => copy(link, 'link')} leadingIcon={copied === 'link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}>
            {t('widget.copy')}
          </Button>
        </div>
        {link && <a href={link} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-semibold text-brand-700 hover:underline">{t('widget.preview')}</a>}
      </div>

      {/* Código para embeber */}
      <div className="rounded-2xl border border-slate-100 p-4">
        <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Code className="h-4 w-4 text-brand-600" aria-hidden="true" /> {t('widget.embed')}
        </p>
        <textarea readOnly rows={3} value={code} className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        <div className="mt-2">
          <Button size="sm" variant="secondary" onClick={() => copy(code, 'code')} leadingIcon={copied === 'code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}>
            {t('widget.copyCode')}
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted">{t('widget.embedHint')}</p>
      </div>

      {/* Solicitudes recibidas */}
      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
          <CalendarClock className="h-4 w-4" aria-hidden="true" /> {t('widget.requests')}
        </p>
        {loading ? (
          <SkeletonCard rows={1} />
        ) : fallo ? (
          <AvisoDeFallo onRetry={() => void load()} />
        ) : rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-muted">{t('widget.noRequests')}</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id} className={`rounded-xl border border-slate-100 p-3 ${r.status === 'new' ? 'bg-white' : 'bg-slate-50'}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{r.name} · <span className="font-normal text-slate-600">{r.contact}</span></p>
                  {r.status !== 'new' && (
                    <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {t(`widget.status.${r.status}`)}
                    </span>
                  )}
                </div>
                {r.preferred && <p className="text-xs text-muted">{t('widget.preferred')}: {r.preferred}</p>}
                {r.note && <p className="mt-1 text-sm text-slate-600">{r.note}</p>}
                <p className="mt-1 text-xs text-muted">{formatDate(r.created_at)}</p>
                {r.status === 'new' && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" leadingIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => void avisar(marcar(r.id, 'atendida'))}>
                      {t('widget.markDone')}
                    </Button>
                    <Button size="sm" variant="secondary" leadingIcon={<XCircle className="h-4 w-4" />} onClick={() => void avisar(marcar(r.id, 'descartada'))}>
                      {t('widget.markDiscard')}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
