/**
 * Encuesta — Primera Encuesta Internacional (neurodesarrollo, neurodivergencia,
 * afecciones neurológicas). Pública y ANÓNIMA: todos responden lo común, luego
 * la rama de su rol; al final, consentimiento obligatorio. Se guarda en
 * `survey_responses` (jsonb) vía RLS (INSERT permitido solo con consent=true).
 *
 * Contenido en español (src/data/surveyContent.ts); se localizará después.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui';
import { COUNTRIES } from '@/data/countries';
import { ROLES, SECTION_OPTIONS, BRANCHES, CLOSING, type Question } from '@/data/surveyContent';

type Val = string | string[];

export function Encuesta() {
  const { i18n } = useTranslation();
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
    if (!role) return setErr('Elige tu perfil.');
    if (sections.length === 0) return setErr('Elige al menos una sección.');
    if (!country) return setErr('Elige tu país.');
    if (!consent) return setErr('Debes aceptar el consentimiento para enviar.');
    setStatus('saving');
    // La tabla es nueva y aún no está en los tipos generados: casteo acotado del cliente.
    const { error } = await (supabase as unknown as {
      from: (t: string) => { insert: (v: unknown) => Promise<{ error: unknown }> };
    }).from('survey_responses').insert({
      lang: i18n.language, role, country, sections, answers, consent: true, source: 'web',
    });
    if (error) { setStatus('error'); setErr('No se pudo enviar. Intenta de nuevo.'); return; }
    setStatus('done');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[15px]';
  const optCls = 'flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-[15px] cursor-pointer hover:border-brand-300 hover:bg-brand-50/40';

  function renderQ(qq: Question) {
    const v = answers[qq.key];
    return (
      <div key={qq.key} className="mt-4">
        <p className="font-semibold text-slate-800">{qq.q}</p>
        {qq.type === 'text' && (
          <textarea rows={3} className={`${inputCls} mt-2`} value={(v as string) || ''}
            onChange={(e) => set(qq.key, e.target.value)} placeholder="Escribe aquí…" />
        )}
        {qq.type === 'select' && (
          <select className={`${inputCls} mt-2`} value={(v as string) || ''} onChange={(e) => set(qq.key, e.target.value)}>
            <option value="">Selecciona…</option>
            {qq.options?.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        )}
        {qq.type === 'radio' && (
          <div className="mt-2 space-y-2">
            {qq.options?.map((o) => (
              <label key={o} className={optCls}>
                <input type="radio" name={qq.key} checked={v === o} onChange={() => set(qq.key, o)} />
                {o}
              </label>
            ))}
          </div>
        )}
        {qq.type === 'checkbox' && (
          <div className="mt-2 space-y-2">
            {qq.options?.map((o) => (
              <label key={o} className={optCls}>
                <input type="checkbox" checked={Array.isArray(v) && v.includes(o)} onChange={() => toggle(qq.key, o)} />
                {o}
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
        <h1 className="text-2xl font-bold text-slate-900">¡Gracias por participar!</h1>
        <p className="mt-3 text-muted">Tu respuesta anónima ya forma parte de la Primera Encuesta Internacional. Publicaremos los resultados agregados en neuromundi.com.</p>
        <div className="mt-6"><Button onClick={() => (window.location.href = '/')}>Volver al inicio</Button></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-brand-700 shadow-sm">📋 Encuesta internacional</span>
      <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-900">Primera Encuesta Internacional de Neurodesarrollo, Neurodivergencia y Afecciones Neurológicas</h1>
      <p className="mt-2 leading-relaxed text-muted">Ayúdanos a conocer la situación internacional para mejorar el acceso y la calidad del acompañamiento. Tus respuestas son <b>anónimas</b> y toman ~5 minutos.</p>

      {/* Común */}
      <div className="mt-6 rounded-3xl border border-brand-100 bg-white p-6 shadow-sm">
        <p className="text-xs font-extrabold uppercase tracking-wide text-brand-700">1 · Sobre ti</p>
        <div className="mt-3">
          <p className="font-semibold text-slate-800">¿Con qué perfil respondes?</p>
          <div className="mt-2 space-y-2">
            {ROLES.map((r) => (
              <label key={r.value} className={optCls}>
                <input type="radio" name="rol" checked={role === r.value} onChange={() => setRole(r.value)} /> {r.label}
              </label>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <p className="font-semibold text-slate-800">¿En qué secciones participas? (una o varias)</p>
          <div className="mt-2 space-y-2">
            {SECTION_OPTIONS.map((sopt) => (
              <label key={sopt.value} className={optCls}>
                <input type="checkbox" checked={sections.includes(sopt.value)} onChange={() => toggleSection(sopt.value)} /> {sopt.label}
              </label>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <p className="font-semibold text-slate-800">¿Desde qué país respondes?</p>
          <select className={`${inputCls} mt-2`} value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">Selecciona tu país…</option>
            {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Rama por rol */}
      {branch.length > 0 && (
        <div className="mt-5 rounded-3xl border border-brand-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-wide text-brand-700">2 · Tu experiencia</p>
          {branch.map(renderQ)}
        </div>
      )}

      {/* Cierre */}
      {role && (
        <div className="mt-5 rounded-3xl border border-brand-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-wide text-brand-700">3 · Para cerrar</p>
          {CLOSING.map(renderQ)}
        </div>
      )}

      {/* Consentimiento */}
      <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-relaxed text-slate-700">
        Algunas respuestas pueden considerarse <b>datos sensibles de salud</b>. Participar es voluntario y anónimo; usaremos los datos <b>solo de forma agregada</b> para publicar resultados y mejorar la comunidad, conforme a nuestro <a href="/privacidad" className="text-brand-700 underline">Aviso de Privacidad</a>.
        <label className="mt-3 flex items-start gap-2 font-semibold text-slate-900">
          <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          He leído y acepto participar de forma anónima y voluntaria, y consiento el tratamiento agregado de mis respuestas.
        </label>
      </div>

      {err && <p className="mt-3 text-sm font-semibold text-red-600">{err}</p>}
      <div className="mt-5">
        <Button size="lg" fullWidth disabled={!canSubmit} onClick={submit}>
          {status === 'saving' ? 'Enviando…' : 'Enviar mis respuestas'}
        </Button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">Encuesta de la Comunidad Neuromundi · muestreo por conveniencia (no probabilístico) · resultados agregados en neuromundi.com.</p>
    </div>
  );
}
