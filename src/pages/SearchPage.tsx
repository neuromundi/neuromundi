/**
 * SearchPage — buscador global (/buscar). Busca en publicaciones, prestadores y
 * productos. Los enlaces externos abren en pestaña nueva; el resto navega dentro.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search as SearchIcon, FileText, Store, Package, SearchX } from 'lucide-react';
import { Button , EmptyState} from '@/components/ui';
import { useSearch, type SearchResult } from '@/hooks/useSearch';

const input = 'w-full rounded-lg border border-slate-200 p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

const ICON: Record<SearchResult['kind'], typeof FileText> = { post: FileText, provider: Store, product: Package };
const KIND_KEY: Record<SearchResult['kind'], string> = { post: 'search.kindPost', provider: 'search.kindProvider', product: 'search.kindProduct' };

export function SearchPage() {
  const { t } = useTranslation();
  const { results, loading, searched, search } = useSearch();
  const [q, setQ] = useState('');

  const Row = ({ r }: { r: SearchResult }) => {
    const Icon = ICON[r.kind];
    const external = /^https?:\/\//i.test(r.url);
    const inner = (
      <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm hover:border-brand-200">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">{r.title}</p>
          {r.subtitle && <p className="line-clamp-1 text-sm text-muted">{r.subtitle}</p>}
          <span className="text-xs uppercase tracking-wide text-brand-700">{t(KIND_KEY[r.kind])}</span>
        </div>
      </div>
    );
    return external ? (
      <a href={r.url} target="_blank" rel="noopener noreferrer">{inner}</a>
    ) : (
      <Link to={r.url}>{inner}</Link>
    );
  };

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-2xl font-bold text-slate-900">{t('search.title')}</h1>
      <form
        className="flex gap-2"
        onSubmit={(e) => { e.preventDefault(); void search(q); }}
      >
        <input className={input} placeholder={t('search.placeholder')} value={q} onChange={(e) => setQ(e.target.value)} />
        <Button type="submit" loading={loading} leadingIcon={<SearchIcon className="h-4 w-4" />}>{t('search.button')}</Button>
      </form>

      {q.trim().length > 0 && q.trim().length < 2 && <p className="text-sm text-muted">{t('search.hint')}</p>}

      <div className="space-y-2">
        {results.map((r) => <Row key={`${r.kind}-${r.id}`} r={r} />)}
        {searched && !loading && results.length === 0 && <EmptyState icon={<SearchX className="h-6 w-6" />} title={t('search.emptyTitle')} description={t('search.empty')} />}
      </div>
    </main>
  );
}
