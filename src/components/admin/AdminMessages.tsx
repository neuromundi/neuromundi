/**
 * AdminMessages — mensajería interna del administrador.
 * Permite enviar un mensaje DIRECTO (por folio NM) o en GRUPO (audiencia) a los
 * usuarios; se entrega como notificación (campana). Muestra el historial enviado.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Megaphone, Send, Users } from 'lucide-react';
import { Button, useToast, SkeletonCard } from '@/components/ui';
import { useAdminMessages, type MessageAudience } from '@/hooks/useAdminMessages';
import { formatDate } from '@/lib/utils';

const inputCls =
  'w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

const AUDIENCES: MessageAudience[] = ['all', 'consumers', 'providers', 'founders', 'direct'];

export function AdminMessages() {
  const { t } = useTranslation();
  const toast = useToast();
  const { sent, loading, busy, send } = useAdminMessages();
  const [audience, setAudience] = useState<MessageAudience>('all');
  const [folio, setFolio] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const memberNo = Number((folio.match(/\d+/g) || []).join(''));
  const valid = body.trim().length > 0 && (audience !== 'direct' || memberNo > 0);

  const errMsg = (code: string) => {
    const known = ['forbidden', 'empty', 'bad_audience', 'recipient_not_found'];
    return known.includes(code) ? t(`msg.err.${code}`) : code;
  };

  const onSend = async () => {
    if (!valid) return;
    const res = await send({ title: title.trim() || undefined, body: body.trim(), audience, memberNo });
    if (res.ok) {
      toast.success(t('msg.sentToast', { count: res.data }));
      setTitle(''); setBody(''); setFolio('');
    } else {
      toast.error(errMsg(res.error));
    }
  };

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h2 className="flex items-center gap-2 font-bold text-slate-900">
          <Megaphone className="h-5 w-5 text-brand-600" aria-hidden="true" /> {t('msg.title')}
        </h2>
        <p className="text-sm text-muted">{t('msg.intro')}</p>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">{t('msg.audience')}</label>
          <select className={inputCls} value={audience} onChange={(e) => setAudience(e.target.value as MessageAudience)}>
            {AUDIENCES.map((a) => <option key={a} value={a}>{t(`msg.aud.${a}`)}</option>)}
          </select>
        </div>

        {audience === 'direct' && (
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">{t('msg.folio')}</label>
            <input className={inputCls} placeholder="NM-000123" value={folio} onChange={(e) => setFolio(e.target.value)} />
          </div>
        )}

        <input className={inputCls} placeholder={t('msg.msgTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea rows={4} className={inputCls} placeholder={t('msg.body')} value={body} onChange={(e) => setBody(e.target.value)} />

        <Button loading={busy} disabled={!valid} onClick={onSend} leadingIcon={<Send className="h-4 w-4" />}>
          {t('msg.send')}
        </Button>
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
          <Users className="h-4 w-4" aria-hidden="true" /> {t('msg.history')}
        </h3>
        {loading ? (
          <SkeletonCard rows={1} />
        ) : sent.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-muted">{t('msg.empty')}</p>
        ) : (
          <ul className="space-y-2">
            {sent.map((m) => (
              <li key={m.id} className="rounded-xl border border-slate-100 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">{m.title || t('msg.noTitle')}</span>
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-800">
                    {t(`msg.aud.${m.audience}`)} · {t('msg.recipients', { count: m.recipient_count })}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{m.body}</p>
                <p className="mt-1 text-xs text-muted">{formatDate(m.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
