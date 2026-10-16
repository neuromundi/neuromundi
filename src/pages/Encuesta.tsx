/**
 * Encuesta — Primera Encuesta Internacional (neurodesarrollo, neurodivergencia,
 * afecciones neurológicas). Pública y ANÓNIMA: todos responden lo común, luego
 * la rama de su rol; al final, consentimiento obligatorio. Se guarda en
 * `survey_responses` (jsonb) vía RLS (INSERT permitido solo con consent=true).
 *
 * Localizada en los once idiomas (auditoría 15 oct 2026, hallazgo M-12). Esta
 * pantalla NO contiene texto: todo sale de `survey.*`. La estructura del
 * cuestionario está en src/data/surveyContent.ts, sin texto tampoco.
 *
 * Lo que se GUARDA de cada opción es su CÓDIGO, no la etiqueta traducida: de
 * otro modo cada respuesta quedaría escrita en el idioma de quien respondió y
 * cruzar países sería imposible. Se guarda también `lang` para saber en qué
 * idioma se contestó.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui';
import { COUNTRIES } from '@/data/countries';
import { ROLES, SECTION_OPTIONS, BRANCHES, SECTION_QUESTIONS, CLOSING, audienceOf, type Question } from '@/data/surveyContent';

type Val = string | string[];

export function Encuesta() {
  const { t, i18n } = useTranslation();
  const [role, setRole] = useState('');
  const [sections, setSections] = useState<string[]>([]);
  const [country, setCountry] = useState('');
  const [answers, setAnswers] = useState<Record<string, Val>>({});
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [err, setErr] = useState('');

  const branch = useMemo<Question[]>(() => (role ? BRANCHES[role] ?? [] : []), [role]);

  const set = (key: string, v: Val) => setAnswers((a) => ({ ...a, [key]: v }));
  const toggle = (key: string, opt: string) =>
    setAnswers((a) => {
      const cur = Array.isArray(a[key]) ? (a[key] as string[]) : [];
      return { ...a, [key]: cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt] };
    });
  const toggleSection = (v: string) =>
    setSections((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));

  const canSubmit = role && country && sections.length > 0 && consent && status !== 'saving';

  async function submit() {
    setErr('');
    if (!role) return setErr(t('survey.content.ui.errRole'));
    if (sections.length === 0) return setErr(t('survey.content.ui.errSections'));
    if (!country) return setErr(t('survey.content.ui.errCountry'));
    if (!consent) return setErr(t('survey.content.ui.errConsent'));
    setStatus('saving');
    // La tabla es nueva y aún no está en los tipos generados: casteo acotado del cliente.
    const { error } = await (supabase as unknown as {
      from: (tb: string) => { insert: (v: unknown) => Promise<{ error: unknown }> };
    }).from('survey_responses').insert({
      lang: i18n.language, role, country, sections, answers, consent: true, source: 'web',
    });
    if (error) { setStatus('error'); setErr(t('survey.content.ui.errSend')); return; }
    setStatus('done');
    // Apaga para siempre (en este dispositivo) la invitación del banner inferior.
    try { localStorage.setItem('neuro.surveyInvite.answered', '1'); } catch { /* noop */ }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[15px]';
  const optCls = 'flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-[15px] cursor-pointer hover:border-brand-300 hover:bg-brand-50/40';

  function renderQ(qq: Question) {
    const v = answers[qq.key];
    // Etiqueta de una opción: survey.content.opt.<clave>.<código>.
    const label = (code: string) => t(`survey.content.opt.${qq.key}.${code}`);
    return (
      <div key={qq.key} className="mt-4">
        <p className="font-semibold text-slate-800">
          {t(`survey.content.q.${qq.key}`)}
          {qq.optional && <span className="ml-1 font-normal text-muted">{t('survey.content.ui.optional')}</span>}
        </p>
        {qq.type === 'text' && (
          <textarea rows={3} className={`${inputCls} mt-2`} value={(v as string) || ''}
            onChange={(e) => set(qq.key, e.target.value)} placeholder={t('survey.content.ui.writeHere')} />
        )}
        {qq.type === 'select' && (
          <select className={`${inputCls} mt-2`} value={(v as string) || ''} onChange={(e) => set(qq.key, e.target.value)}>
            <option value="">{t('survey.content.ui.pick')}</option>
            {qq.options?.map((o) => <option key={o} value={o}>{label(o)}</option>)}
          </select>
        )}
        {qq.type === 'radio' && (
          <div className="mt-2 space-y-2">
            {qq.options?.map((o) => (
              <label key={o} className={optCls}>
                <input type="radio" name={qq.key} checked={v === o} onChange={() => set(qq.key, o)} />
                {label(o)}
              </label>
            ))}
          </div>
        )}
        {qq.type === 'checkbox' && (
          <div className="mt-2 space-y-2">
            {qq.options?.map((o) => (
              <label key={o} className={optCls}>
                <input type="checkbox" checked={Array.isArray(v) && v.includes(o)} onChange={() => toggle(qq.key, o)} />
                {label(o)}
              </label>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">✓</div>
        <h1 className="text-2xl font-bold text-slate-900">{t('survey.content.ui.doneTitle')}</h1>
        <p className="mt-3 text-muted">{t('survey.content.ui.doneBody')}</p>
        <div className="mt-6"><Button onClick={() => (window.location.href = '/')}>{t('survey.content.ui.doneHome')}</Button></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-brand-700 shadow-sm">{t('survey.content.ui.badge')}</span>
      <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-900">{t('survey.content.ui.title')}</h1>
      <p className="mt-2 leading-relaxed text-muted">{t('survey.content.ui.intro')}</p>

      {/* Común */}
      <div className="mt-6 rounded-3xl border border-brand-100 bg-white p-6 shadow-sm">
        <p className="text-xs font-extrabold uppercase tracking-wide text-brand-700">{t('survey.content.ui.step1')}</p>
        <div className="mt-3">
          <p className="font-semibold text-slate-800">{t('survey.content.ui.askRole')}</p>
          <div className="mt-2 space-y-2">
            {ROLES.map((r) => (
              <label key={r} className={optCls}>
                <input type="radio" name="rol" checked={role === r} onChange={() => setRole(r)} /> {t(`survey.content.role.${r}`)}
              </label>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <p className="font-semibold text-slate-800">{t('survey.content.ui.askSections')}</p>
          <div className="mt-2 space-y-2">
            {SECTION_OPTIONS.map((sopt) => (
              <label key={sopt} className={optCls}>
                <input type="checkbox" checked={sections.includes(sopt)} onChange={() => toggleSection(sopt)} /> {t(`survey.content.section.${sopt}`)}
              </label>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <p className="font-semibold text-slate-800">{t('survey.content.ui.askCountry')}</p>
          <select className={`${inputCls} mt-2`} value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">{t('survey.content.ui.pickCountry')}</option>
            {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Rama por rol */}
      {branch.length > 0 && (
        <div className="mt-5 rounded-3xl border border-brand-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-wide text-brand-700">{t('survey.content.ui.step2')}</p>
          {branch.map(renderQ)}
        </div>
      )}

      {/* Bloques específicos por cada sección elegida */}
      {role && SECTION_OPTIONS.filter((s) => sections.includes(s)).map((s) => {
        const qs = SECTION_QUESTIONS[s]?.[audienceOf(role)] ?? [];
        if (qs.length === 0) return null;
        return (
          <div key={s} className="mt-5 rounded-3xl border border-brand-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-extrabold uppercase tracking-wide text-brand-700">
              {t('survey.content.ui.sectionPrefix')} · {t(`survey.content.section.${s}`)}
            </p>
            {qs.map(renderQ)}
          </div>
        );
      })}

      {/* Cierre */}
      {role && (
        <div className="mt-5 rounded-3xl border border-brand-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-wide text-brand-700">{t('survey.content.ui.step3')}</p>
          {CLOSING.map(renderQ)}
        </div>
      )}

      {/* Consentimiento */}
      <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-relaxed text-slate-700">
        {t('survey.content.ui.consentText')}{' '}
        <a href="/privacy" className="text-brand-700 underline">{t('survey.content.ui.privacyLink')}</a>.
        <label className="mt-3 flex items-start gap-2 font-semibold text-slate-900">
          <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          {t('survey.content.ui.consentCheck')}
        </label>
      </div>

      {err && <p className="mt-3 text-sm font-semibold text-red-600">{err}</p>}
      <div className="mt-5">
        <Button size="lg" fullWidth disabled={!canSubmit} onClick={submit}>
          {status === 'saving' ? t('survey.content.ui.sending') : t('survey.content.ui.submit')}
        </Button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">{t('survey.content.ui.footer')}</p>
    </div>
  );
}
