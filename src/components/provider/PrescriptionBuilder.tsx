/**
 * PrescriptionBuilder — el terapeuta arma el "carrito recetado".
 *
 * Explora el catálogo de productos afiliados, los agrega con cantidad y una nota
 * de uso, vincula al padre escaneando su QR (resuelto por RPC segura) y envía la
 * receta. La plataforma no cobra: la compra se concreta luego con el proveedor.
 */
import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Minus, Trash2, ScanLine, Send, UserCheck, ShoppingCart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Modal, SkeletonCard, useToast, HowTo} from '@/components/ui';
import { MiniQrScanner } from './MiniQrScanner';
import { useAuth } from '@/hooks/useAuth';
import { useProducts } from '@/hooks/useProducts';
import { usePrescriptions, type ResolvedParent } from '@/hooks/usePrescriptions';
import type { CartDraftItem, ParentQrPayload, Product } from '@/types/app';

function parsePayload(text: string): ParentQrPayload | null {
  try {
    const o = JSON.parse(text);
    if (typeof o?.parentId === 'string' && typeof o?.qrToken === 'string') {
      return { parentId: o.parentId, qrToken: o.qrToken };
    }
  } catch {
    /* no es JSON */
  }
  return null;
}

export function PrescriptionBuilder() {
  const { userId } = useAuth();
  const { t } = useTranslation();
  const { products, loading } = useProducts();
  const { resolveParentByQr, sendCart } = usePrescriptions(userId, 'therapist');
  const toast = useToast();

  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartDraftItem[]>([]);
  const [recipient, setRecipient] = useState<ResolvedParent | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [title, setTitle] = useState(() => '');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  // Título por defecto traducido (y se reusa al reiniciar tras enviar).
  const defaultTitle = t('rx.recommendation');
  useEffect(() => {
    setTitle((prev) => (prev ? prev : defaultTitle));
  }, [defaultTitle]);

  useEffect(() => {
    const t = setTimeout(() => setQuery(searchInput.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filtered = useMemo(() => {
    if (!query) return products;
    return products.filter((p) =>
      `${p.name} ${p.vendorName ?? ''}`.toLowerCase().includes(query),
    );
  }, [products, query]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const found = prev.find((i) => i.product.id === product.id);
      if (found) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prev, { product, quantity: 1, note: '' }];
    });
  };
  const setQty = (id: string, delta: number) =>
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
        .filter((i) => i.quantity > 0),
    );
  const setItemNote = (id: string, value: string) =>
    setCart((prev) => prev.map((i) => (i.product.id === id ? { ...i, note: value } : i)));
  const removeItem = (id: string) =>
    setCart((prev) => prev.filter((i) => i.product.id !== id));

  const handleScan = async (text: string) => {
    setScanOpen(false);
    const payload = parsePayload(text);
    if (!payload) {
      toast.error(t('rx.notParentQr'));
      return;
    }
    const res = await resolveParentByQr(payload);
    if (res.ok) {
      setRecipient(res.data);
      toast.success(t('rx.linkedWith', { name: res.data.fullName }));
    } else {
      toast.error(res.error);
    }
  };

  const canSend = !!recipient && cart.length > 0 && !sending;

  const handleSend = async () => {
    if (!recipient) return;
    setSending(true);
    const res = await sendCart({ parentId: recipient.id, title, note, items: cart });
    setSending(false);
    if (res.ok) {
      toast.success(t('rx.sent'));
      setCart([]);
      setRecipient(null);
      setNote('');
      setTitle(defaultTitle);
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 p-4">
      <HowTo stepsKey="howto.prescribe" />
      {/* Destinatario */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold text-slate-900">{t('rx.forWhom')}</h2>
        {recipient ? (
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-slate-800">
              <UserCheck className="h-5 w-5 text-sage-500" aria-hidden="true" />
              {recipient.fullName}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setRecipient(null)}>
              {t('rx.change')}
            </Button>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setScanOpen(true)} leadingIcon={<ScanLine className="h-5 w-5" />}>
            {t('rx.scanParentQr')}
          </Button>
        )}
      </section>

      {/* Catálogo */}
      <section>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('rx.searchAffiliated')}
            aria-label={t('rx.searchProducts')}
            className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
        </div>
        {loading ? (
          <SkeletonCard rows={0} />
        ) : filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-muted">
            {t('rx.noProducts')}
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3">
                {p.image_url ? (
                  <img loading="lazy" decoding="async" src={p.image_url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="h-12 w-12 shrink-0 rounded-lg bg-slate-100" aria-hidden="true" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{p.name}</p>
                  <p className="truncate text-sm text-muted">
                    {p.vendorName ?? t('rx.providerFallback')}
                    {p.price != null && ` · $${p.price.toLocaleString()}`}
                  </p>
                </div>
                <Button size="sm" onClick={() => addToCart(p)} leadingIcon={<Plus className="h-4 w-4" />}>
                  {t('rx.add')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Carrito */}
      <section className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
          <ShoppingCart className="h-5 w-5 text-brand-700" aria-hidden="true" />
          {t('rx.cart', { count: cart.length })}
        </h2>

        {cart.length === 0 ? (
          <p className="text-sm text-muted">{t('rx.emptyCatalog')}</p>
        ) : (
          <ul className="space-y-3">
            {cart.map((item) => (
              <li key={item.product.id} className="rounded-xl bg-white p-3">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-900">{item.product.name}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setQty(item.product.id, -1)} aria-label={t('rx.decrease')} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-6 text-center tabular-nums">{item.quantity}</span>
                    <button type="button" onClick={() => setQty(item.product.id, 1)} aria-label={t('rx.increase')} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200">
                      <Plus className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => removeItem(item.product.id)} aria-label={t('rx.remove')} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-slate-100">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <input
                  value={item.note}
                  onChange={(e) => setItemNote(item.product.id, e.target.value)}
                  placeholder={t('rx.useNote')}
                  aria-label={t('rx.noteFor', { name: item.product.name })}
                  className="mt-2 w-full rounded-lg border border-slate-200 p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                />
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label={t('rx.titleField')}
            className="w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={t('rx.messageField')}
            aria-label={t('rx.messageLabel')}
            className="w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
          <Button onClick={handleSend} disabled={!canSend} loading={sending} leadingIcon={<Send className="h-5 w-5" />} fullWidth>
            {recipient ? t('rx.sendTo', { name: recipient.fullName }) : t('rx.linkToSend')}
          </Button>
        </div>
      </section>

      <Modal open={scanOpen} onClose={() => setScanOpen(false)} title={t('rx.scanParentQr')}>
        {scanOpen && <MiniQrScanner onDecoded={handleScan} onError={(m) => toast.error(m)} />}
      </Modal>
    </div>
  );
}
