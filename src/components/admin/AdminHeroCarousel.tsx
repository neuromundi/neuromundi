/**
 * AdminHeroCarousel — gestión del carrusel de la portada (tabla hero_slides,
 * bucket 'hero', migración 0133). El admin sube/reemplaza imágenes, edita los
 * captions por idioma (español obligatorio como respaldo; el resto opcional),
 * reordena, activa/desactiva y elimina escenas. Si no hay escenas activas, la
 * portada usa las 15 por defecto.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, ArrowDown, Trash2, Plus, Eye, EyeOff, ImagePlus } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { useAdminHeroSlides, type HeroSlide } from '@/hooks/useHeroSlides';

const LANGS: [string, string][] = [
  ['es', 'Español'], ['en', 'English'], ['fr', 'Français'], ['de', 'Deutsch'],
  ['it', 'Italiano'], ['pt', 'Português'], ['ja', '日本語'], ['zh', '中文'],
  ['ar', 'العربية'], ['he', 'עברית'], ['ko', '한국어'],
];

export function AdminHeroCarousel() {
  const { t } = useTranslation();
  const toast = useToast();
  const { slides, loading, uploadImage, create, update, remove, move } = useAdminHeroSlides();
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [busy, setBusy] = useState(false);
  const [newEs, setNewEs] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);

  const draftFor = (s: HeroSlide): Record<string, string> => drafts[s.id] ?? s.captions ?? {};
  const setCap = (s: HeroSlide, lang: string, val: string) =>
    setDrafts((d) => ({ ...d, [s.id]: { ...(d[s.id] ?? s.captions ?? {}), [lang]: val } }));

  const saveCaps = async (s: HeroSlide) => {
    setBusy(true);
    const err = await update(s.id, { captions: draftFor(s) });
    setBusy(false);
    err ? toast.error(err) : toast.success(t('adm.hero.saved'));
  };

  const replaceImg = async (s: HeroSlide, file: File) => {
    setBusy(true);
    const r = await uploadImage(file);
    if ('error' in r) { setBusy(false); toast.error(r.error); return; }
    const err = await update(s.id, { image_url: r.url });
    setBusy(false);
    err ? toast.error(err) : toast.success(t('adm.hero.saved'));
  };

  const addScene = async () => {
    if (!newFile) { toast.error(t('adm.hero.needImage')); return; }
    setBusy(true);
    const r = await uploadImage(newFile);
    if ('error' in r) { setBusy(false); toast.error(r.error); return; }
    const err = await create(r.url, newEs.trim() ? { es: newEs.trim() } : {});
    setBusy(false);
    if (err) { toast.error(err); return; }
    setNewEs(''); setNewFile(null);
    toast.success(t('adm.hero.added'));
  };

  const del = async (s: HeroSlide) => {
    if (!window.confirm(t('adm.hero.confirmDel'))) return;
    setBusy(true);
    const err = await remove(s.id);
    setBusy(false);
    if (err) toast.error(err);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{t('adm.hero.title')}</h2>
        <p className="mt-1 text-sm text-muted">{t('adm.hero.intro')}</p>
      </div>

      {/* Agregar escena */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="mb-2 font-semibold text-slate-900">{t('adm.hero.addTitle')}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="mb-1 block text-sm text-slate-700">{t('adm.hero.image')}</span>
            <input type="file" accept="image/*" onChange={(e) => setNewFile(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-sm text-slate-700">{t('adm.hero.captionEs')}</span>
            <input value={newEs} onChange={(e) => setNewEs(e.target.value)} placeholder={t('adm.hero.captionOptional')} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm" />
          </label>
          <Button onClick={() => void addScene()} loading={busy} leadingIcon={<Plus className="h-4 w-4" />}>{t('adm.hero.add')}</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted">{t('common.loading', { defaultValue: 'Cargando…' })}</p>
      ) : slides.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-muted">{t('adm.hero.emptyDefault')}</p>
      ) : (
        <ul className="space-y-3">
          {slides.map((s, idx) => (
            <li key={s.id} className={`rounded-2xl border p-4 ${s.is_active ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50 opacity-80'}`}>
              <div className="flex gap-4">
                <img src={s.image_url} alt="" className="h-24 w-20 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-muted">#{idx + 1}</span>
                    <div className="ml-auto flex items-center gap-1">
                      <button type="button" onClick={() => void move(s.id, -1)} disabled={idx === 0} aria-label={t('adm.hero.up')} className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" onClick={() => void move(s.id, 1)} disabled={idx === slides.length - 1} aria-label={t('adm.hero.down')} className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40"><ArrowDown className="h-4 w-4" /></button>
                      <button type="button" onClick={() => void update(s.id, { is_active: !s.is_active })} aria-label={t(s.is_active ? 'adm.hero.hide' : 'adm.hero.show')} className="rounded-lg border border-slate-200 p-1.5">{s.is_active ? <Eye className="h-4 w-4 text-sage-600" /> : <EyeOff className="h-4 w-4 text-slate-400" />}</button>
                      <button type="button" onClick={() => void del(s)} aria-label={t('adm.hero.delete')} className="rounded-lg border border-slate-200 p-1.5 text-evs-1"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-700">{t('adm.hero.captionEs')}</span>
                    <input value={draftFor(s).es ?? ''} onChange={(e) => setCap(s, 'es', e.target.value)} className="w-full rounded-xl border border-slate-200 p-2 text-sm" />
                  </label>

                  <details className="rounded-xl border border-slate-100 bg-slate-50/60 p-2">
                    <summary className="cursor-pointer text-xs font-semibold text-brand-700">{t('adm.hero.translations')}</summary>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {LANGS.filter(([code]) => code !== 'es').map(([code, label]) => (
                        <label key={code} className="block">
                          <span className="mb-0.5 block text-[11px] text-muted">{label}</span>
                          <input dir={code === 'ar' || code === 'he' ? 'rtl' : 'ltr'} value={draftFor(s)[code] ?? ''} onChange={(e) => setCap(s, code, e.target.value)} className="w-full rounded-lg border border-slate-200 p-1.5 text-sm" />
                        </label>
                      ))}
                    </div>
                  </details>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button size="sm" onClick={() => void saveCaps(s)} loading={busy}>{t('adm.hero.saveCaptions')}</Button>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      <ImagePlus className="h-4 w-4" /> {t('adm.hero.replaceImage')}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void replaceImg(s, f); }} />
                    </label>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
