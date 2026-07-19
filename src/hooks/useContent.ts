/**
 * useContent — Fase 4 (blogs / enlaces a redes + valoraciones + comentarios).
 *  - useContent: el autor (prestador) gestiona sus publicaciones.
 *  - useContentFeed: lista de publicaciones publicadas con su promedio de estrellas.
 *  - usePost: una publicación con su valoración, comentarios; registrar vista, valorar, comentar.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toMessage } from '@/lib/utils';
import type { Tables } from '@/types/database';
import type { Result } from '@/types/app';

export type Post = Tables<'content_posts'>;
export type Comment = Tables<'content_comments'>;
export interface PostRating { avg_stars: number; rating_count: number }
export type FeedItem = Post & { rating: PostRating | null };

async function ratingsFor(ids: string[]): Promise<Record<string, PostRating>> {
  if (ids.length === 0) return {};
  const { data } = await supabase.from('public_post_ratings').select('*').in('post_id', ids);
  const map: Record<string, PostRating> = {};
  for (const r of data ?? []) map[r.post_id] = { avg_stars: Number(r.avg_stars), rating_count: r.rating_count };
  return map;
}

// ── Autor ────────────────────────────────────────────────────────────────────
export function useContent() {
  const { userId } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from('content_posts').select('*').eq('author_id', userId).order('created_at', { ascending: false });
    setPosts(data ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(
    async (p: { type: 'blog' | 'link'; title: string; body?: string; external_url?: string; keywords: string[]; topic?: string; excerpt?: string; cover_url?: string }): Promise<Result<true>> => {
      if (!userId) return { ok: false, error: 'Sin sesión' };
      const { error } = await supabase.from('content_posts').insert({
        author_id: userId, type: p.type, title: p.title, body: p.body || null, external_url: p.external_url || null, keywords: p.keywords,
        topic: p.topic || null, excerpt: p.excerpt || null, cover_url: p.cover_url || null,
      });
      if (error) return { ok: false, error: toMessage(error) };
      await load();
      return { ok: true, data: true };
    },
    [userId, load],
  );

  const togglePublish = useCallback(async (id: string, is_published: boolean): Promise<Result<true>> => {
    const { error } = await supabase.from('content_posts').update({ is_published }).eq('id', id);
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [load]);

  const remove = useCallback(async (id: string): Promise<Result<true>> => {
    const { error } = await supabase.from('content_posts').delete().eq('id', id);
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [load]);

  return { posts, loading, reload: load, create, togglePublish, remove };
}

// ── Feed (consumidores) ────────────────────────────────────────────────────────
export function useContentFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('content_posts').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(30);
      const posts = data ?? [];
      const map = await ratingsFor(posts.map((p) => p.id));
      setItems(posts.map((p) => ({ ...p, rating: map[p.id] ?? null })));
      setLoading(false);
    })();
  }, []);

  return { items, loading };
}

// ── Publicación individual ─────────────────────────────────────────────────────
export function usePost(id: string) {
  const { userId } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [rating, setRating] = useState<PostRating | null>(null);
  const [myStars, setMyStars] = useState<number | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: p }, map, { data: c }] = await Promise.all([
      supabase.from('content_posts').select('*').eq('id', id).single(),
      ratingsFor([id]),
      supabase.from('content_comments').select('*').eq('post_id', id).order('created_at'),
    ]);
    setPost(p ?? null);
    setRating(map[id] ?? null);
    setComments(c ?? []);
    if (userId) {
      const { data: mine } = await supabase.from('content_ratings').select('stars').eq('post_id', id).eq('user_id', userId).maybeSingle();
      setMyStars(mine?.stars ?? null);
      // Registrar vista (idempotente por PK post_id+user_id).
      await supabase.from('content_views').upsert({ post_id: id, user_id: userId }, { onConflict: 'post_id,user_id' });
    }
    setLoading(false);
  }, [id, userId]);

  useEffect(() => { void load(); }, [load]);

  const rate = useCallback(async (stars: number): Promise<Result<true>> => {
    if (!userId) return { ok: false, error: 'Sin sesión' };
    const { error } = await supabase.from('content_ratings').upsert({ post_id: id, user_id: userId, stars }, { onConflict: 'post_id,user_id' });
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [id, userId, load]);

  const comment = useCallback(async (body: string): Promise<Result<true>> => {
    if (!userId) return { ok: false, error: 'Sin sesión' };
    const { error } = await supabase.from('content_comments').insert({ post_id: id, user_id: userId, body });
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [id, userId, load]);

  return { post, rating, myStars, comments, loading, rate, comment };
}
