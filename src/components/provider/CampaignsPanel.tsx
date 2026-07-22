/**
 * CampaignsPanel — campañas del especialista (Funcionalidad 6).
 * Redacta un mensaje y lo envía a su lista de espera o a sus pacientes por los
 * canales elegidos: notificación push/in-app, correo y SMS. El envío real lo
 * hace la Edge Function send-campaign.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Megaphone, Send } from 'lucide-react';
import { Button, useToast, SkeletonCard } from '@/components/ui';
import { useCampaigns, type CampaignAudience, type CampaignChannel } from '@/hooks/useWaitlist';
import { formatDate, cn } from '@/lib/utils';

const inputCls =
  'w-full rounded-xl border border-slate-200 p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

const CHANNELS: CampaignChannel[] = ['push', 'email', 'sms'];
const AUDIENCES: CampaignAudience[] = ['waitlist', 'patients'];

export function CampaignsPanel() {
  const { t } = useTranslation();
  const toast = useToast();
  const { items, loading, createAndSend } = useCampaigns();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [channels, setChannels] = useState<CampaignChannel[]>(['push']);
  const [audience, setAudience] = useState<CampaignAudience>('waitlist');
  const [busy, setBusy] = useState(false);

  const toggle = (c: CampaignChannel) =>
    setChannels((v) => (v.includes(c) ? v.filter((x) => x !== c) : [...v, c]));

  const onSend = async () => {
    if (!title.trim() || !body.trim()) { toast.error(t('camp.needText')); return; }
    setBusy(true);
    const r = await createAndSend(title.trim(), body.trim(), channels, audience);
    setBusy(false);
    if (!r.ok) { toast.error(t(`camp.err.${r.error}`, t('camp.err.generic'))); return; }
    setTitle(''); setBody('');
    toast.success(t('camp.sent', { count: r.data }));
  };

  return (
    <div className="space-y-4">
      <p className="rounded-xl border border-warm-200 bg-warm-50 p-3 text-sm text-warm-800">
        {t('camp.consentHint')}
      </p>

      <section className="space-y-3 rounded-2xl border border-slate-100 p-4">
        <h3 className="flex items-center gap-2 font-semibold text-slate-900">
          <Megaphone className="h-4 w-4 text-brand-600" aria-hidden="true" /> {t('camp.newTitle')}
        </h3>

        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('camp.subject')} />
        <textarea className={inputCls} rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t('camp.body')} />

        <div>
          <p className="mb-1 text-xs font-semibold text-slate-700">{t('camp.audience')}</p>
          <div className="flex flex-wrap gap-2">
            {AUDIENCES.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAudience(a)}
                aria-pressed={audience === a}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm font-medium',
                  audience === a ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50',
                )}
              >
                {t(`camp.aud.${a}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold text-slate-700">{t('camp.channels')}</p>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggle(c)}
                aria-pressed={channels.includes(c)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm font-medium',
                  channels.includes(c) ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50',
                )}
              >
                {t(`camp.ch.${c}`)}
              </button>
            ))}
          </div>
          {channels.includes('sms') && <p className="mt-1 text-xs text-warm-700">{t('camp.smsCost')}</p>}
        </div>

        <Button loading={busy} onClick={onSend} leadingIcon={<Send className="h-4 w-4" />}>
          {t('camp.send')}
        </Button>
      </section>

      {loading ? (
        <SkeletonCard rows={2} />
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-muted">{t('camp.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => (
            <li key={c.id} className="rounded-2xl border border-slate-100 p-3">
              <p className="font-semibold text-slate-900">{c.title}</p>
              <p className="text-sm text-slate-600">{c.body}</p>
              <p className="mt-1 text-xs text-muted">
                {t(`camp.aud.${c.audience}`)} · {(c.channels ?? []).map((x) => t(`camp.ch.${x}`)).join(', ')} ·{' '}
                {t('camp.sentCount', { count: c.sent_count })} · {formatDate(c.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
