/**
 * useHeroSlides / useAdminHeroSlides — escenas del carrusel de la portada,
 * editables por el admin (migración 0133). La imagen vive en el bucket público
 * 'hero'; los captions son un mapa por idioma { es, en, … } con respaldo al
 * español. Si no hay escenas activas, HeroCarousel usa las 15 por defecto.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface HeroSlide {
  id: string;
  image_url: string;
  captions: Record<string, string>;
  sort_order: number;
  is_active: boolean;
}

/** Lectura pública: solo escenas activas, en orden. */
export function useHeroSlides() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('hero_slides')
        .select('id, image_url, captions, sort_order, is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (cancelled) return;
      setSlides((data as HeroSlide[] | null) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return { slides, loading };
}

/** Gestión admin: todas las escenas + CRUD, subida de imagen y reordenamiento. */
export function useAdminHeroSlides() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('hero_slides')
      .select('id, image_url, captions, sort_order, is_active')
      .order('sort_order', { ascending: true });
    setSlides((data as HeroSlide[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  /** Sube una imagen al bucket 'hero' y devuelve su URL pública. */
  const uploadImage = useCallback(async (file: File): Promise<{ url: string } | { error: string }> => {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `slide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const up = await supabase.storage.from('hero').upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (up.error) return { error: up.error.message };
    const { data: pub } = supabase.storage.from('hero').getPublicUrl(path);
    return { url: pub.publicUrl };
  }, []);

  const create = useCallback(async (image_url: string, captions: Record<string, string>): Promise<string | null> => {
    const nextOrder = slides.reduce((m, s) => Math.max(m, s.sort_order), 0) + 1;
    const { error } = await supabase.from('hero_slides').insert({ image_url, captions, sort_order: nextOrder, is_active: true });
    if (error) return error.message;
    await load();
    return null;
  }, [slides, load]);

  const update = useCallback(async (id: string, patch: Partial<Pick<HeroSlide, 'image_url' | 'captions' | 'is_active'>>): Promise<string | null> => {
    const { error } = await supabase.from('hero_slides').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return error.message;
    await load();
    return null;
  }, [load]);

  const remove = useCallback(async (id: string): Promise<string | null> => {
    const { error } = await supabase.from('hero_slides').delete().eq('id', id);
    if (error) return error.message;
    await load();
    return null;
  }, [load]);

  /** Intercambia el orden con el vecino (dir -1 sube, +1 baja). */
  const move = useCallback(async (id: string, dir: -1 | 1): Promise<void> => {
    const idx = slides.findIndex((s) => s.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= slides.length) return;
    const a = slides[idx];
    const b = slides[j];
    await supabase.from('hero_slides').update({ sort_order: b.sort_order }).eq('id', a.id);
    await supabase.from('hero_slides').update({ sort_order: a.sort_order }).eq('id', b.id);
    await load();
  }, [slides, load]);

  return { slides, loading, reload: load, uploadImage, create, update, remove, move };
}
