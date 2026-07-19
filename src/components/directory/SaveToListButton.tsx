/**
 * SaveToListButton — guardar un proveedor en una lista del padre.
 *
 * Solo se renderiza para padres (lo decide quien lo monta). Abre un modal con
 * las listas (marcar/desmarcar) y permite crear una lista nueva al vuelo.
 */
import { useState } from 'react';
import { Bookmark, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Modal, useToast } from '@/components/ui';
import { useParentLists } from '@/hooks/useParentLists';

export function SaveToListButton({ providerId }: { providerId: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { lists, itemsByList, createList, addItem, removeItem, listsContaining } = useParentLists();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const inLists = listsContaining(providerId);
  const saved = inLists.length > 0;

  const toggle = async (listId: string) => {
    if (inLists.includes(listId)) {
      const item = itemsByList[listId]?.find((i) => i.id === providerId);
      if (item) {
        const res = await removeItem(item.itemId);
        toast[res.ok ? 'success' : 'error'](res.ok ? t('lists.removedFrom') : res.error);
      }
    } else {
      const res = await addItem(listId, providerId);
      toast[res.ok ? 'success' : 'error'](res.ok ? t('lists.addedTo') : res.error);
    }
  };

  const create = async () => {
    const res = await createList(newName || t('lists.newListPlaceholder'));
    if (res.ok) {
      setNewName('');
      await addItem(res.data.id, providerId);
      toast.success(t('lists.addedTo'));
    } else {
      toast.error(res.error);
    }
  };

  return (
    <>
      <Button
        variant={saved ? 'secondary' : 'primary'}
        size="sm"
        leadingIcon={<Bookmark className="h-4 w-4" />}
        onClick={() => setOpen(true)}
      >
        {t('lists.saveTo')}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title={t('lists.saveTo')}>
        <div className="space-y-3">
          {lists.length === 0 && <p className="text-sm text-muted">{t('lists.empty')}</p>}
          {lists.map((l) => (
            <label key={l.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={inLists.includes(l.id)}
                onChange={() => toggle(l.id)}
                className="h-5 w-5 rounded border-slate-300 text-brand-500"
              />
              <span className="flex-1 text-slate-800">{l.title}</span>
              <span className="text-xs text-muted">{t('lists.items', { count: l.itemCount })}</span>
            </label>
          ))}

          <div className="flex gap-2 border-t border-slate-100 pt-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('lists.newName')}
              className="flex-1 rounded-xl border border-slate-200 p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
            <Button size="sm" leadingIcon={<Plus className="h-4 w-4" />} onClick={create}>
              {t('lists.create')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
