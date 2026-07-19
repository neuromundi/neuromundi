/**
 * ConsentManager — la familia otorga o revoca acceso a su expediente a cada
 * especialista (tomados de sus favoritos). El consentimiento es revocable.
 */
import { useTranslation } from 'react-i18next';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { Button, SkeletonCard, useToast } from '@/components/ui';
import { useConsents } from '@/hooks/useClinical';

export function ConsentManager({ onPick }: { onPick?: (providerId: string, name: string) => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { granted, connections, loading, grant, revoke } = useConsents();

  if (loading) return <SkeletonCard rows={2} />;

  const activeIds = new Set(granted.filter((g) => g.status === 'active').map((g) => g.provider.id));
  const notGranted = connections.filter((c) => !activeIds.has(c.id));

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <h3 className="mb-1 font-semibold text-slate-900">{t('clin.consentTitle')}</h3>
      <p className="mb-3 text-sm text-muted">{t('clin.consentHelp')}</p>

      {granted.filter((g) => g.status === 'active').length > 0 && (
        <ul className="mb-3 space-y-2">
          {granted.filter((g) => g.status === 'active').map((g) => (
            <li key={g.provider.id} className="flex items-center gap-2 rounded-xl border border-evs-5/30 bg-evs-5/5 p-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-evs-5" />
              <button type="button" className="min-w-0 flex-1 truncate text-left font-medium text-slate-800 hover:underline" onClick={() => onPick?.(g.provider.id, g.provider.name)}>
                {g.provider.name}
              </button>
              <button type="button" onClick={async () => { const r = await revoke(g.provider.id); toast[r.ok ? 'success' : 'error'](r.ok ? t('clin.revoked') : r.error); }} className="inline-flex items-center gap-1 text-xs text-evs-1 hover:underline">
                <ShieldOff className="h-3.5 w-3.5" /> {t('clin.revoke')}
              </button>
            </li>
          ))}
        </ul>
      )}

      {notGranted.length > 0 ? (
        <div className="space-y-2">
          {notGranted.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-xl border border-slate-100 p-2 text-sm">
              <span className="min-w-0 flex-1 truncate text-slate-700">{c.name}</span>
              <Button size="sm" variant="secondary" onClick={async () => { const r = await grant(c.id); toast[r.ok ? 'success' : 'error'](r.ok ? t('clin.granted') : r.error); }}>
                {t('clin.grant')}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        granted.length === 0 && <p className="text-sm text-muted">{t('clin.noConnections')}</p>
      )}
    </section>
  );
}
