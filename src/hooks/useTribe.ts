/**
 * useTribe — Tribu Neuromundi (F1). Membresía (inscripción con reglas + semáforo
 * de energía + privacidad por capas), foros temáticos (crear → pendiente de
 * aprobación, listar aprobados con filtros, unirse), invitaciones y chat básico.
 * Lecturas de foros/mensajes/invitaciones vía RPC (respetan privacidad).
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export type TribeEnergy = 'green' | 'yellow' | 'red';
export type TribeStatus = 'active' | 'muted' | 'suspended';

export interface TribeMember {
  status: TribeStatus;
  energy: TribeEnergy;
  show_country: boolean;
  show_city: boolean;
  show_interests: boolean;
  show_diagnosis: boolean;
  rules_accepted_at: string | null;
  points: number;
  silent_mode: boolean;
}

export interface TribePrivacy {
  show_country: boolean;
  show_city: boolean;
  show_interests: boolean;
  show_diagnosis: boolean;
}

export function useTribeMembership() {
  const { userId } = useAuth();
  const [member, setMember] = useState<TribeMember | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) { setMember(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('tribe_members')
      .select('status, energy, show_country, show_city, show_interests, show_diagnosis, rules_accepted_at, points, silent_mode')
      .eq('user_id', userId)
      .maybeSingle();
    setMember((data as TribeMember | null) ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const join = useCallback(async (energy: TribeEnergy, privacy: TribePrivacy): Promise<boolean> => {
    if (!userId) return false;
    const { error } = await supabase.from('tribe_members').upsert({
      user_id: userId, status: 'active', energy, ...privacy, rules_accepted_at: new Date().toISOString(),
    });
    if (!error) await load();
    return !error;
  }, [userId, load]);

  const setEnergy = useCallback(async (energy: TribeEnergy): Promise<boolean> => {
    if (!userId) return false;
    const { error } = await supabase.from('tribe_members').update({ energy }).eq('user_id', userId);
    if (!error) setMember((m) => (m ? { ...m, energy } : m));
    return !error;
  }, [userId]);

  const setPrivacy = useCallback(async (privacy: TribePrivacy): Promise<boolean> => {
    if (!userId) return false;
    const { error } = await supabase.from('tribe_members').update(privacy).eq('user_id', userId);
    if (!error) setMember((m) => (m ? { ...m, ...privacy } : m));
    return !error;
  }, [userId]);

  const setSilent = useCallback(async (silent: boolean): Promise<boolean> => {
    const { error } = await supabase.rpc('tribe_set_silent', { p_silent: silent });
    if (!error) setMember((m) => (m ? { ...m, silent_mode: silent } : m));
    return !error;
  }, []);

  const isActive = member?.status === 'active';
  const isSuspended = member?.status === 'suspended';
  const canWrite = member?.status === 'active';

  return { member, loading, isActive, isSuspended, canWrite, join, setEnergy, setPrivacy, setSilent, reload: load };
}

export interface ImpactRow { badge_key: string; n: number; points: number; silent: boolean }

/** Impacto acumulado (insignias recibidas) de un miembro + fichas propias hoy. */
export function useTribeGratitude(targetUserId?: string | null) {
  const [impact, setImpact] = useState<ImpactRow[]>([]);
  const [tokensLeft, setTokensLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadImpact = useCallback(async () => {
    if (!targetUserId) { setImpact([]); return; }
    const { data } = await supabase.rpc('tribe_impact', { p_user: targetUserId });
    setImpact((data as ImpactRow[] | null) ?? []);
  }, [targetUserId]);

  const loadTokens = useCallback(async () => {
    const { data } = await supabase.rpc('tribe_tokens_left');
    setTokensLeft(typeof data === 'number' ? data : null);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => { await Promise.all([loadImpact(), loadTokens()]); if (alive) setLoading(false); })();
    return () => { alive = false; };
  }, [loadImpact, loadTokens]);

  const give = useCallback(async (receiverId: string, badgeKey: string, forumId: string | null, anonymous: boolean): Promise<{ ok: boolean; error?: string; left?: number }> => {
    const { data, error } = await supabase.rpc('tribe_give_gratitude', {
      p_receiver: receiverId, p_badge: badgeKey, p_forum: forumId, p_anonymous: anonymous,
    });
    if (error) return { ok: false, error: error.message };
    const left = typeof data === 'number' ? data : undefined;
    if (left != null) setTokensLeft(left);
    return { ok: true, left };
  }, []);

  return { impact, tokensLeft, loading, give, reloadTokens: loadTokens, reloadImpact: loadImpact };
}

export interface MyModerator { status: 'pending' | 'approved' | 'rejected'; points: number; justification: string | null }

/** Mi estado como moderador + postulación. */
export function useTribeModerator() {
  const [mod, setMod] = useState<MyModerator | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('tribe_my_moderator');
    const row = (data as MyModerator[] | null)?.[0] ?? null;
    setMod(row);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const apply = useCallback(async (justification: string): Promise<string | null> => {
    const { error } = await supabase.rpc('tribe_apply_moderator', { p_justification: justification, p_accept: true });
    if (error) return error.message;
    await load();
    return null;
  }, [load]);

  return { mod, loading, apply, reload: load };
}

export interface ModeratorRow {
  user_id: string; name: string; points: number; avg_rating: number; n_ratings: number; i_rated: boolean;
}

/** Directorio de moderadores aprobados + calificar. */
export function useTribeModerators() {
  const [mods, setMods] = useState<ModeratorRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('tribe_moderators_list');
    setMods((data as ModeratorRow[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const rate = useCallback(async (moderatorId: string, scores: { empathy: number; inclusive: number; cordiality: number; knowledge: number; availability: number }, comment: string, anonymous: boolean): Promise<string | null> => {
    const { error } = await supabase.rpc('tribe_rate_moderator', {
      p_moderator: moderatorId, p_empathy: scores.empathy, p_inclusive: scores.inclusive,
      p_cordiality: scores.cordiality, p_knowledge: scores.knowledge, p_availability: scores.availability,
      p_comment: comment || null, p_anonymous: anonymous,
    });
    if (error) return error.message;
    await load();
    return null;
  }, [load]);

  return { mods, loading, rate, reload: load };
}



export interface TribeForum {
  id: string;
  title: string;
  description: string | null;
  theme: string | null;
  country: string | null;
  city: string | null;
  language: string | null;
  members: number;
  i_member: boolean;
  created_at: string;
}

export interface ForumFilters {
  query?: string;
  country?: string;
  language?: string;
  theme?: string;
}

export function useTribeForums(filters: ForumFilters) {
  const [forums, setForums] = useState<TribeForum[]>([]);
  const [loading, setLoading] = useState(true);
  const { query, country, language, theme } = filters;

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('tribe_forums_list', {
      p_query: query ?? null, p_country: country ?? null, p_language: language ?? null, p_theme: theme ?? null,
    });
    setForums(error ? [] : ((data as TribeForum[] | null) ?? []));
    setLoading(false);
  }, [query, country, language, theme]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (input: { title: string; description: string; theme: string; country: string; city: string; language: string; notifyCountries: string[]; applyModerator: boolean }): Promise<boolean> => {
    const { error } = await supabase.rpc('tribe_create_forum', {
      p_title: input.title, p_description: input.description || '', p_theme: input.theme || '',
      p_country: input.country || '', p_city: input.city || '', p_language: input.language || '',
      p_notify_countries: input.notifyCountries.length ? input.notifyCountries : null,
      p_apply_moderator: input.applyModerator,
    });
    if (!error) await load();
    return !error;
  }, [load]);

  const joinForum = useCallback(async (forumId: string): Promise<boolean> => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return false;
    const { error } = await supabase.from('tribe_forum_members').insert({ forum_id: forumId, user_id: uid });
    if (!error) await load();
    return !error;
  }, [load]);

  const closeForum = useCallback(async (forumId: string): Promise<boolean> => {
    const { error } = await supabase.rpc('tribe_close_forum', { p_forum: forumId });
    if (!error) await load();
    return !error;
  }, [load]);

  return { forums, loading, reload: load, create, joinForum, closeForum };
}

/** Preferencias de push de foros de Tribu (activar + países de interés). */
export function useTribeForumPrefs() {
  const [prefs, setPrefs] = useState<{ push_enabled: boolean; countries: string[] }>({ push_enabled: true, countries: [] });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('tribe_forum_prefs_get');
    const row = (data as { push_enabled: boolean; countries: string[] | null }[] | null)?.[0];
    setPrefs({ push_enabled: row?.push_enabled ?? true, countries: row?.countries ?? [] });
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const save = useCallback(async (push_enabled: boolean, countries: string[]): Promise<boolean> => {
    const { error } = await supabase.rpc('tribe_forum_prefs_set', { p_push: push_enabled, p_countries: countries.length ? countries : null });
    if (!error) setPrefs({ push_enabled, countries });
    return !error;
  }, []);

  return { prefs, loading, save };
}

export interface TribeMessage {
  id: string;
  author_id: string;
  author_name: string;
  author_energy: TribeEnergy;
  author_is_mod: boolean;
  body: string;
  created_at: string;
}

export function useTribeMessages(forumId: string | null) {
  const [messages, setMessages] = useState<TribeMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!forumId) { setMessages([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.rpc('tribe_forum_messages', { p_forum: forumId });
    setMessages(error ? [] : ((data as TribeMessage[] | null) ?? []));
    setLoading(false);
  }, [forumId]);

  useEffect(() => { void load(); }, [load]);

  const send = useCallback(async (body: string): Promise<boolean> => {
    if (!forumId || !body.trim()) return false;
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return false;
    const { error } = await supabase.from('tribe_messages').insert({ forum_id: forumId, author_id: uid, body: body.trim() });
    if (!error) await load();
    return !error;
  }, [forumId, load]);

  return { messages, loading, reload: load, send };
}

export interface TribeInvite {
  id: string;
  forum_id: string;
  forum_title: string;
  inviter_name: string;
  created_at: string;
}

export function useTribeInvites() {
  const [invites, setInvites] = useState<TribeInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('tribe_my_invites');
    setInvites(error ? [] : ((data as TribeInvite[] | null) ?? []));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const invite = useCallback(async (forumId: string, memberNo: number): Promise<string | null> => {
    const { error } = await supabase.rpc('tribe_invite', { p_forum: forumId, p_member_no: memberNo });
    return error ? error.message : null;
  }, []);

  const respond = useCallback(async (inviteId: string, accept: boolean): Promise<boolean> => {
    const { error } = await supabase.rpc('tribe_respond_invite', { p_invite: inviteId, p_accept: accept });
    if (!error) await load();
    return !error;
  }, [load]);

  return { invites, loading, reload: load, invite, respond };
}
