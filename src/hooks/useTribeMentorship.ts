/**
 * useTribeMentorship — Mentoría de pares (F4). Ofrecerse como mentor (ND→ND o
 * Familia→Familia), listar mentores, solicitar mentoría, aceptar/rechazar, y el
 * hilo 1:1 ASÍNCRONO (sin presión de inmediatez). Lecturas por RPC.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type MentorTrack = 'nd_youth' | 'family_family';
export const MENTOR_TRACKS: MentorTrack[] = ['nd_youth', 'family_family'];

export interface MyMentor { tracks: MentorTrack[]; bio: string | null; is_active: boolean }

export function useMyMentor() {
  const [mentor, setMentor] = useState<MyMentor | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('tribe_my_mentor');
    setMentor((data as MyMentor[] | null)?.[0] ?? null);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const become = useCallback(async (tracks: MentorTrack[], bio: string): Promise<string | null> => {
    const { error } = await supabase.rpc('tribe_become_mentor', { p_tracks: tracks, p_bio: bio || null });
    if (error) return error.message;
    await load();
    return null;
  }, [load]);

  const setActive = useCallback(async (active: boolean): Promise<boolean> => {
    const { error } = await supabase.rpc('tribe_set_mentor_active', { p_active: active });
    if (!error) setMentor((m) => (m ? { ...m, is_active: active } : m));
    return !error;
  }, []);

  return { mentor, loading, become, setActive, reload: load };
}

export interface MentorRow { user_id: string; name: string; tracks: MentorTrack[]; bio: string | null; my_status: string | null }

export function useMentors(track: MentorTrack | '') {
  const [mentors, setMentors] = useState<MentorRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('tribe_mentors_list', { p_track: track || null });
    setMentors((data as MentorRow[] | null) ?? []);
    setLoading(false);
  }, [track]);
  useEffect(() => { void load(); }, [load]);

  const request = useCallback(async (mentorId: string, trk: MentorTrack): Promise<string | null> => {
    const { error } = await supabase.rpc('tribe_request_mentor', { p_mentor: mentorId, p_track: trk });
    if (error) return error.message;
    await load();
    return null;
  }, [load]);

  return { mentors, loading, request, reload: load };
}

export interface Mentorship { id: string; role: 'mentor' | 'mentee'; counterpart_name: string; track: string; status: string; created_at: string }

export function useMyMentorships() {
  const [items, setItems] = useState<Mentorship[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('tribe_my_mentorships');
    setItems((data as Mentorship[] | null) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const respond = useCallback(async (id: string, accept: boolean): Promise<boolean> => {
    const { error } = await supabase.rpc('tribe_respond_mentorship', { p_id: id, p_accept: accept });
    if (!error) await load();
    return !error;
  }, [load]);

  return { items, loading, respond, reload: load };
}

export interface MentorMsg { id: string; author_id: string; author_name: string; body: string; created_at: string }

export function useMentorThread(mentorshipId: string | null) {
  const [messages, setMessages] = useState<MentorMsg[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!mentorshipId) { setMessages([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.rpc('tribe_mentor_messages_list', { p_mentorship: mentorshipId });
    setMessages((data as MentorMsg[] | null) ?? []);
    setLoading(false);
  }, [mentorshipId]);
  useEffect(() => { void load(); }, [load]);

  const send = useCallback(async (body: string): Promise<boolean> => {
    if (!mentorshipId || !body.trim()) return false;
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return false;
    const { error } = await supabase.from('tribe_mentor_messages').insert({ mentorship_id: mentorshipId, author_id: uid, body: body.trim() });
    if (!error) await load();
    return !error;
  }, [mentorshipId, load]);

  return { messages, loading, send, reload: load };
}
