/**
 * NetworkPanel — administración de la red del proveedor.
 *
 * Tres bloques: solicitudes recibidas (aceptar/rechazar), enviadas (cancelar) y
 * la red actual (quitar). Los padres nunca llegan aquí (es un panel de proveedor).
 */
import { Link } from 'react-router-dom';
import { Check, X, Clock, UserMinus, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, SkeletonCard, useToast, HowTo} from '@/components/ui';
import { useConnections } from '@/hooks/useConnections';
import type { ConnectionWithProfile } from '@/types/app';

function Avatar({ url }: { url: string | null }) {
  return url ? (
    <img loading="lazy" decoding="async" src={url} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
      <Users className="h-5 w-5" aria-hidden="true" />
    </span>
  );
}

function Row({ c, children }: { c: ConnectionWithProfile; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3">
      <Avatar url={c.other.avatar_url} />
      <div className="min-w-0 flex-1">
        <Link to={`/proveedor/${c.other.id}`} className="truncate font-semibold text-slate-900 hover:underline">
          {c.other.name}
        </Link>
        {c.other.city && <p className="text-sm text-muted">{c.other.city}</p>}
      </div>
      <div className="flex shrink-0 gap-2">{children}</div>
    </li>
  );
}

export function NetworkPanel() {
  const { t } = useTranslation();
  const toast = useToast();
  const { network, incoming, outgoing, loading, accept, remove } = useConnections();

  const act = async (p: Promise<{ ok: boolean; error?: string }>, okMsg: string) => {
    const res = await p;
    toast[res.ok ? 'success' : 'error'](res.ok ? okMsg : res.error ?? '');
  };

  if (loading) return <SkeletonCard rows={2} />;

  return (
    <div className="space-y-6">
      <HowTo stepsKey="howto.network" />
      {incoming.length > 0 && (
        <section>
          <h3 className="mb-2 font-semibold text-slate-900">{t('network.incoming')}</h3>
          <ul className="space-y-2">
            {incoming.map((c) => (
              <Row key={c.connection.id} c={c}>
                <Button size="sm" leadingIcon={<Check className="h-4 w-4" />}
                  onClick={() => act(accept(c.connection.id), t('network.accepted'))}>
                  {t('network.accept')}
                </Button>
                <Button size="sm" variant="ghost" leadingIcon={<X className="h-4 w-4" />}
                  onClick={() => act(remove(c.connection.id), t('network.removed'))}>
                  {t('network.decline')}
                </Button>
              </Row>
            ))}
          </ul>
        </section>
      )}

      {outgoing.length > 0 && (
        <section>
          <h3 className="mb-2 font-semibold text-slate-900">{t('network.outgoing')}</h3>
          <ul className="space-y-2">
            {outgoing.map((c) => (
              <Row key={c.connection.id} c={c}>
                <Button size="sm" variant="ghost" leadingIcon={<Clock className="h-4 w-4" />}
                  onClick={() => act(remove(c.connection.id), t('network.removed'))}>
                  {t('network.cancel')}
                </Button>
              </Row>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-2 font-semibold text-slate-900">{t('network.myNetwork')}</h3>
        {network.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-muted">
            {t('network.empty')}
          </div>
        ) : (
          <ul className="space-y-2">
            {network.map((c) => (
              <Row key={c.connection.id} c={c}>
                <Button size="sm" variant="ghost" leadingIcon={<UserMinus className="h-4 w-4" />}
                  onClick={() => act(remove(c.connection.id), t('network.removed'))}>
                  {t('network.remove')}
                </Button>
              </Row>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
