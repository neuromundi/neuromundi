/**
 * ParentLists — listas de proveedores del padre (pestaña del panel).
 *
 * Crear/renombrar/eliminar listas, quitar proveedores y compartir por enlace
 * (toggle público + copiar URL). Los proveedores nunca llegan aquí.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Share2, Copy, Pencil, Check, X, Store, Stethoscope } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, SkeletonCard, useToast, HowTo} from '@/components/ui';
import { useParentLists } from '@/hooks/useParentLists';
import type { ParentListItemResolved, ParentListWithCount } from '@/types/app';

function shareUrl(token: string) {
  return `${window.location.origin}/lista/${token}`;
}

function ItemRow({ item, onRemove }: { item: ParentListItemResolved; onRemove: () => void }) {
  const { t } = useTranslation();
  const Icon = item.provider_type === 'merchant' ? Store : Stethoscope;
  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5">
      {item.avatar_url ? (
        <img loading="lazy" decoding="async" src={item.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
      <Link to={`/proveedor/${item.id}`} className="min-w-0 flex-1 truncate font-medium text-slate-800 hover:underline">
        {item.name}
      </Link>
      <button type="button" onClick={onRemove} aria-label={t('lists.remove')}
        className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-evs-1">
        <X className="h-4 w-4" />
      </button>
    </li>
  );
}

function ListCard({
  list,
  items,
}: {
  list: ParentListWithCount;
  items: ParentListItemResolved[];
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const { renameList, deleteList, toggleShare, removeItem } = useParentLists();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(list.title);

  const onRename = async () => {
    const res = await renameList(list.id, title);
    if (!res.ok) toast.error(res.error);
    setEditing(false);
  };

  const onShare = async () => {
    const res = await toggleShare(list.id, !list.is_public);
    if (!res.ok) toast.error(res.error);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl(list.share_token));
      toast.success(t('lists.linkCopied'));
    } catch {
      toast.error(shareUrl(list.share_token));
    }
  };

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 p-2 text-sm" />
            <Button size="sm" leadingIcon={<Check className="h-4 w-4" />} onClick={onRename}>
              {t('common.save')}
            </Button>
          </>
        ) : (
          <>
            <h3 className="flex-1 font-bold text-slate-900">{list.title}</h3>
            <span className="text-xs text-muted">{t('lists.items', { count: list.itemCount })}</span>
            <button type="button" onClick={() => setEditing(true)} aria-label={t('lists.rename')}
              className="rounded-lg p-1.5 text-muted hover:bg-slate-100">
              <Pencil className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => void deleteList(list.id)} aria-label={t('lists.delete')}
              className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-evs-1">
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{t('lists.emptyItems')}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((it) => (
            <ItemRow key={it.itemId} item={it} onRemove={() => void removeItem(it.itemId)} />
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <Button size="sm" variant={list.is_public ? 'secondary' : 'ghost'}
          leadingIcon={<Share2 className="h-4 w-4" />} onClick={onShare}>
          {list.is_public ? t('lists.shareOn') : t('lists.shareOff')}
        </Button>
        {list.is_public && (
          <Button size="sm" variant="ghost" leadingIcon={<Copy className="h-4 w-4" />} onClick={copy}>
            {t('lists.copyLink')}
          </Button>
        )}
      </div>
    </section>
  );
}

export function ParentLists() {
  const { t } = useTranslation();
  const toast = useToast();
  const { lists, itemsByList, loading, createList } = useParentLists();
  const [newName, setNewName] = useState('');

  const create = async () => {
    const res = await createList(newName || t('lists.newListPlaceholder'));
    if (res.ok) setNewName('');
    else toast.error(res.error);
  };

  if (loading) return <SkeletonCard rows={2} />;

  return (
    <div className="space-y-4">
      <HowTo stepsKey="howto.lists" />
      <div className="flex gap-2">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t('lists.newName')}
          className="flex-1 rounded-xl border border-slate-200 p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500" />
        <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={create}>
          {t('lists.create')}
        </Button>
      </div>

      {lists.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-muted">
          {t('lists.empty')}
        </div>
      ) : (
        lists.map((l) => <ListCard key={l.id} list={l} items={itemsByList[l.id] ?? []} />)
      )}
    </div>
  );
}
