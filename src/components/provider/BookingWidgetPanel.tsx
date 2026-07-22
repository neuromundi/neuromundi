/**
 * BookingWidgetPanel — el prestador obtiene su enlace y el código para embeber
 * el widget de reserva directa en su web o redes (iframe /reservar/NM-000123),
 * y ve las solicitudes de reserva recibidas.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link2, Code, Copy, Check, CalendarClock } from 'lucide-react';
import { Button, useToast, SkeletonCard } from '@/components/ui';
import { useProfile } from '@/hooks/useProfile';
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
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);

  const folio = profile?.member_no != null ? `NM-${String(profile.member_no).padStart(6, '0')}` : '';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.neuromundi.com';
  const link = folio ? `${origin}/reservar/${folio}` : '';
  const code = link ? `<iframe src="${link}" width="100%" height="640" style="border:0;border-radius:16px" title="Reserva Neuromundi"></iframe>` : '';

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from('booking_requests' as never)
      .select('id, name, contact, preferred, note, status, created_at')
      .order('created_at', { ascending: false })
      .limit(30);
    setRows((data ?? []) as unknown as BookingRow[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => { void load(); }, [load]);

  const copy = async (text: string, which: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which); setTimeout(() => setCopied(null), 1500);
      toast.success(t('widget.copied'));
    } catch { toast.error(t('widget.copyError')); }
  };

  if (!profile) return <SkeletonCard rows={2} />;

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
        ) : rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-muted">{t('widget.noRequests')}</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id} className="rounded-xl border border-slate-100 bg-white p-3">
                <p className="text-sm font-semibold text-slate-900">{r.name} · <span className="font-normal text-slate-600">{r.contact}</span></p>
                {r.preferred && <p className="text-xs text-muted">{t('widget.preferred')}: {r.preferred}</p>}
                {r.note && <p className="mt-1 text-sm text-slate-600">{r.note}</p>}
                <p className="mt-1 text-xs text-muted">{formatDate(r.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
