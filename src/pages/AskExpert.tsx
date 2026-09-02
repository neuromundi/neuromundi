/**
 * AskExpert — "Pregunta a un experto". Formulario de consulta orientativa que se
 * envía a admin@neuromundi.com reutilizando la Edge Function send-support; si
 * falla, cae a un mailto. Pública.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tList } from '@/lib/tList';
import { useCatLabel } from '@/lib/catLabel';
import { MessageCircleQuestion, Check, ShieldCheck, Mail } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { useCategories } from '@/hooks/useCategories';
import { supabase } from '@/lib/supabase';

const EXPERT_EMAIL = 'admin@neuromundi.com';
const input = 'w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

export function AskExpert() {
  const { t } = useTranslation();
  const catLabel = useCatLabel();
  const toast = useToast();
  const { categories } = useCategories();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);

  const notes = tList(t, 'expert.form.notes');

  const mailtoFallback = () => {
    const subject = t('expert.mail.subject');
    const body = [
      `${t('expert.form.name')}: ${name || '—'}`,
      `${t('expert.form.email')}: ${email || '—'}`,
      `${t('expert.form.category')}: ${categories.find((c) => String(c.id) === categoryId)?.name ?? '—'}`,
      '',
      question.trim(),
    ].join('\n');
    window.location.href = `mailto:${EXPERT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const send = async () => {
    if (question.trim().length < 5) {
      toast.error(t('expert.form.emptyMsg'));
      return;
    }
    setSending(true);
    const catName = categories.find((c) => String(c.id) === categoryId)?.name ?? '—';
    const message = [
      `[${t('expert.mail.subject')}]`,
      `${t('expert.form.name')}: ${name || '—'}`,
      `${t('expert.form.email')}: ${email || '—'}`,
      `${t('expert.form.category')}: ${catName}`,
      '',
      question.trim(),
    ].join('\n');
    try {
      const { error } = await supabase.functions.invoke('send-support', {
        body: {
          category: 'pregunta-experto',
          message,
          replyTo: email || undefined,
          url: window.location.href,
          userAgent: navigator.userAgent,
        },
      });
      if (error) throw error;
      toast.success(t('expert.form.sent'));
      setName(''); setEmail(''); setCategoryId(''); setQuestion('');
    } catch {
      toast.error(t('expert.form.error'));
      mailtoFallback();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Héroe */}
      <section className="rounded-3xl bg-gradient-to-br from-cyan-600 to-brand-600 p-8 text-white">
        <div className="flex items-center gap-3">
          <MessageCircleQuestion className="h-8 w-8" />
          <h1 className="text-3xl font-extrabold">{t('expert.hero.title')}</h1>
        </div>
        <p className="mt-2 text-cyan-50">{t('expert.hero.subtitle')}</p>
        <ul className="mt-5 space-y-2">
          {[t('expert.hero.b1'), t('expert.hero.b2'), t('expert.hero.b3')].map((b) => (
            <li key={b} className="flex items-start gap-2">
              <Check className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Formulario */}
      <section className="mt-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">{t('expert.form.title')}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input className={input} placeholder={t('expert.form.name')} aria-label={t('expert.form.name')} value={name} onChange={(e) => setName(e.target.value)} />
          <input className={input} type="email" placeholder={t('expert.form.email')} aria-label={t('expert.form.email')} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <select className={`${input} mt-3`} aria-label={t('expert.form.category')} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">{t('expert.form.categoryAll')}</option>
          {categories.map((c) => <option key={c.id} value={String(c.id)}>{catLabel(c.slug, c.name)}</option>)}
        </select>
        <textarea
          className={`${input} mt-3 min-h-[160px] resize-y`}
          placeholder={t('expert.form.placeholder')}
          aria-label={t('expert.form.title')}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <ul className="mt-3 space-y-1 text-xs text-muted">
          {notes.map((n) => <li key={n}>• {n}</li>)}
        </ul>
        <Button onClick={send} loading={sending} className="mt-4" leadingIcon={<Mail className="h-4 w-4" />}>
          {t('expert.form.submit')}
        </Button>
      </section>

      {/* Cómo funciona */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900">{t('expert.how.title')}</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <li key={n} className="rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm">
              <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-cyan-50 font-bold text-cyan-700">{n}</span>
              <h3 className="mt-2 text-sm font-bold text-slate-900">{t(`expert.how.s${n}Title`)}</h3>
              <p className="mt-1 text-xs text-muted">{t(`expert.how.s${n}Body`)}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted">
          <ShieldCheck className="h-4 w-4 text-cyan-600" /> {t('expert.disclaimer')}
        </p>
      </section>
    </div>
  );
}
