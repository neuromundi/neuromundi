/**
 * SharedList — vista pública de una lista compartida (/lista/:token).
 *
 * Solo lectura. No requiere sesión: usa el RPC get_shared_list.
 */
import { useParams, Link } from 'react-router-dom';
import { Store, Stethoscope, ListChecks } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SkeletonCard } from '@/components/ui';
import { useSharedList } from '@/hooks/useSharedList';

export function SharedList() {
  const { token = '' } = useParams();
  const { t } = useTranslation();
  const { list, loading } = useSharedList(token);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <SkeletonCard rows={3} />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center text-muted">{t('lists.notFound')}</div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <header className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <ListChecks className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{list.title}</h1>
          <p className="text-sm text-muted">{t('lists.sharedBy', { name: list.owner_name })}</p>
        </div>
      </header>

      {list.items.length === 0 ? (
        <p className="text-sm text-muted">{t('lists.emptyItems')}</p>
      ) : (
        <ul className="space-y-2">
          {list.items.map((it) => {
            const Icon = it.provider_type === 'merchant' ? Store : Stethoscope;
            return (
              <li key={it.provider_id} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                <Link to={`/proveedor/${it.provider_id}`} className="flex items-center gap-3">
                  {it.avatar_url ? (
                    <img loading="lazy" decoding="async" src={it.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{it.name}</p>
                    {it.city && <p className="text-sm text-muted">{it.city}</p>}
                    {it.note && <p className="mt-0.5 text-sm text-slate-600">{it.note}</p>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
