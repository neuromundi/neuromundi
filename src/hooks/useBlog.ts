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
import type { SectionValue } from '@/data/sections';
import { perteneceASeccion } from '@/components/common/SectionFilter';
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
  const [section, setSection] = useState<SectionValue | null>(null);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    // El tope era 60 y el blog ya pasa de esa cifra: con 68 entradas se perdían
    // ocho sin que nadie lo notara. Se sube con holgura y el filtro por sección
    // y por tema hace el resto.
    let query = supabase.from('blog_feed').select('*').order('created_at', { ascending: false }).limit(300);
    if (topic) query = query.eq('topic', topic);
    const { data } = await query;
    setPosts((data as BlogPost[]) ?? []);
    setLoading(false);
  }, [topic]);

  useEffect(() => { void load(); }, [load]);

  const term = q.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      posts.filter((p) => {
        if (!perteneceASeccion(p.sections, section)) return false;
        if (!term) return true;
        return `${p.title} ${p.excerpt ?? ''} ${(p.keywords ?? []).join(' ')}`.toLowerCase().includes(term);
      }),
    [posts, term, section],
  );

  return { posts: filtered, loading, topic, setTopic, section, setSection, q, setQ, reload: load };
}

export function useBlogRecommendations(limit = 6) {
  const { userId } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let vivo = true;
      // Bandera de cancelación: al cambiar la dependencia, la respuesta
      // más lenta de la consulta anterior puede llegar DESPUÉS y pintarse
      // encima de la nueva. (Auditoría 15 oct 2026, hallazgo M-4.)
    (async () => {
      setLoading(true);
      const { data } = await supabase.rpc('recommend_blog', { p_limit: limit });
      if (!vivo) return;
      setPosts((data as BlogPost[]) ?? []);
      setLoading(false);
    })();
    return () => { vivo = false; };
  }, [limit, userId]);

  return { posts, loading };
}

export function useAuthorPosts(authorId: string) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authorId) return;
    let vivo = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('blog_feed')
        .select('*')
        .eq('author_id', authorId)
        .order('created_at', { ascending: false })
        .limit(60);
      if (!vivo) return;
      setPosts((data as BlogPost[]) ?? []);
      setLoading(false);
    })();
    return () => { vivo = false; };
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
