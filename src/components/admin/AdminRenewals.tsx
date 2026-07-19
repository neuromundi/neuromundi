/**
 * AdminRenewals — control de renovaciones de membresía. Lista los perfiles a los
 * que la plataforma cobra (proveedores/prestadores), ordenados por fecha de
 * renovación más próxima, con estado (vencida / próxima ≤30 días / al día).
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, RefreshCw } from 'lucide-react';
import { Button, SkeletonCard, FounderBadge } from '@/components/ui';
import { useAdminRenewals } from '@/hooks/useAdminRenewals';
import { formatDate } from '@/lib/utils';

function statusChip(days: number | null): { key: string; cls: string } {
  if (days == null) return { key: 'renew.noDate', cls: 'bg-slate-100 text-slate-500' };
  if (days < 0) return { key: 'renew.overdue', cls: 'bg-red-50 text-evs-1' };
  if (days <= 30) return { key: 'renew.soon', cls: 'bg-warm-50 text-warm-700' };
  return { key: 'renew.ok', cls: 'bg-sage-50 text-sage-700' };
}

export function AdminRenewals() {
  const { t } = useTranslation();
  const { rows, loading, reload } = useAdminRenewals();
  const [q, setQ] = useState('');

  const term = q.trim().toLowerCase();
  const filtered = useMemo(
    () => rows.filter((r) => !term || `${r.name} ${r.country ?? ''} NM-${r.member_no ?? ''}`.toLowerCase().includes(term)),
    [rows, term],
  );

  if (loading) return <SkeletonCard rows={4} />;

  const overdue = rows.filter((r) => r.days_until != null && r.days_until < 0).length;
  const soon = rows.filter((r) => r.days_until != null && r.days_until >= 0 && r.days_until <= 30).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-evs-1">{t('renew.overdue')}: {overdue}</span>
        <span className="rounded-full bg-warm-50 px-2.5 py-1 text-xs font-semibold text-warm-700">{t('renew.soon')}: {soon}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{t('renew.total')}: {rows.length}</span>
        <Button size="sm" variant="secondary" className="ml-auto" onClick={reload} leadingIcon={<RefreshCw className="h-4 w-4" />}>
          {t('renew.refresh')}
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('renew.search')}
          aria-label={t('renew.search')}
          className="w-full rounded-xl border border-slate-200 py-2.5 pl-11 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">{t('renew.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => {
            const chip = statusChip(r.days_until);
            const date = r.paid_until ?? r.due_at;
            return (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                <FounderBadge isFounder={r.is_founder} size="xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">
                    {r.name} {r.member_no != null && <span className="font-mono text-xs text-muted">NM-{String(r.member_no).padStart(6, '0')}</span>}
                  </p>
                  <p className="text-xs text-muted">
                    {r.provider_type ? t(`cat.${r.provider_type}`, { defaultValue: r.provider_type }) : '—'}
                    {r.country ? ` · ${r.country}` : ''}
                    {date ? ` · ${t('renew.on')} ${formatDate(date)}` : ` · ${t('renew.noDate')}`}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${chip.cls}`}>
                  {t(chip.key)}{r.days_until != null && r.days_until >= 0 ? ` (${r.days_until}${t('renewal.d')})` : ''}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
