/**
 * useBlog — feed público del Blog Neuromundi con taxonomía, buscador y
 * recomendaciones personalizadas por intereses del usuario.
 *
 * - useBlogFeed(): lee la vista `blog_feed` (publicaciones publicadas +
 *   autor + métricas) con filtro por topic y búsqueda por texto.
 * - useBlogRecommendations(): invoca el RPC `recommend_blog`, que ordena por
 *   solape con profiles.interests y recencia.
 * - useInterests(): lee/guarda los intereses del usuario (onboarding).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toMessage } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import type { Database } from '@/types/database';
import type { Result } from '@/types/app';

export type BlogPost = Database['public']['Views']['blog_feed']['Row'];

export function useBlogFeed() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('blog_feed').select('*').order('created_at', { ascending: false }).limit(60);
    if (topic) query = query.eq('topic', topic);
    const { data } = await query;
    setPosts((data as BlogPost[]) ?? []);
    setLoading(false);
  }, [topic]);

  useEffect(() => { void load(); }, [load]);

  const term = q.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      posts.filter((p) =>
        !term ? true : `${p.title} ${p.excerpt ?? ''} ${(p.keywords ?? []).join(' ')}`.toLowerCase().includes(term),
      ),
    [posts, term],
  );

  return { posts: filtered, loading, topic, setTopic, q, setQ, reload: load };
}

export function useBlogRecommendations(limit = 6) {
  const { userId } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.rpc('recommend_blog', { p_limit: limit });
      setPosts((data as BlogPost[]) ?? []);
      setLoading(false);
    })();
  }, [limit, userId]);

  return { posts, loading };
}

export function useAuthorPosts(authorId: string) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authorId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('blog_feed')
        .select('*')
        .eq('author_id', authorId)
        .order('created_at', { ascending: false })
        .limit(60);
      setPosts((data as BlogPost[]) ?? []);
      setLoading(false);
    })();
  }, [authorId]);

  const author = posts[0] ?? null;
  return { posts, author, loading };
}

export function useInterests() {
  const { userId } = useAuth();
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const interests = useMemo(() => profile?.interests ?? [], [profile]);

  const save = useCallback(
    async (next: string[]): Promise<Result<true>> => {
      if (!userId) return { ok: false, error: 'Sin sesión' };
      const { error } = await supabase.from('profiles').update({ interests: next }).eq('id', userId);
      if (error) return { ok: false, error: toMessage(error) };
      if (profile) setProfile({ ...profile, interests: next });
      return { ok: true, data: true };
    },
    [userId, profile, setProfile],
  );

  return { interests, save, hasInterests: interests.length > 0 };
}
