/**
 * useClinical — Fase 5 (expediente con consentimiento).
 *  - useConsents: la familia otorga/revoca acceso a especialistas; el especialista
 *    ve a qué familias tiene acceso.
 *  - useClinicalRecord(patientId): entradas (notas/reportes), tareas y chat para
 *    un expediente concreto, según el rol del usuario.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toMessage } from '@/lib/utils';
import type { Tables } from '@/types/database';
import type { Result } from '@/types/app';

export type Consent = Tables<'clinical_consents'>;
export type Entry = Tables<'clinical_entries'>;
export type Task = Tables<'home_tasks'>;
export type Message = Tables<'clinical_messages'>;

interface Party { id: string; name: string }

// ── Consentimientos ────────────────────────────────────────────────────────────
export function useConsents() {
  const { userId, isConsumer } = useAuth();
  const [granted, setGranted] = useState<(Consent & { provider: Party })[]>([]);
  const [accessTo, setAccessTo] = useState<(Consent & { patient: Party })[]>([]);
  const [connections, setConnections] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  // Son CONSENTIMIENTOS de expediente clinico. Si la lectura falla y la lista
  // se queda vacia, la pantalla dice «no has dado acceso a nadie» o «no tienes
  // acceso a ningun expediente», que es una afirmacion sobre permisos de datos
  // de salud: la peor de todas para darla por buena sin comprobar.
  // (Repaso adversario, 20 oct 2026.)
  const [fallo, setFallo] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    if (isConsumer) {
      const { data, error } = await supabase
        .from('clinical_consents')
        .select('*, provider:profiles!clinical_consents_provider_id_fkey(id, full_name, business_name)')
        .eq('patient_id', userId);
      if (error) { setFallo(true); setLoading(false); return; }
      setFallo(false);
      setGranted(
        (data ?? []).map((c) => {
          const pr = c.provider as unknown as { id: string; full_name: string | null; business_name: string | null };
          return { ...c, provider: { id: pr.id, name: pr.business_name || pr.full_name || '' } };
        }),
      );
      // Especialistas guardados en favoritos a los que se les puede dar acceso.
      // Esta es la lista de especialistas a los que se PODRIA dar acceso: si
      // falla, no se puede afirmar nada, pero tampoco se pierde el expediente.
      const { data: conns, error: errConns } = await supabase
        .from('parent_list_items')
        .select('provider:profiles!parent_list_items_provider_id_fkey(id, full_name, business_name, provider_type), parent_lists!inner(owner_id)')
        .eq('parent_lists.owner_id', userId);
      if (errConns) { setFallo(true); setLoading(false); return; }
      const seen = new Set<string>();
      const list: Party[] = [];
      for (const x of conns ?? []) {
        const pr = x.provider as unknown as { id: string; full_name: string | null; business_name: string | null; provider_type: string | null };
        if (pr && pr.provider_type === 'service_provider' && !seen.has(pr.id)) {
          seen.add(pr.id);
          list.push({ id: pr.id, name: pr.business_name || pr.full_name || '' });
        }
      }
      setConnections(list);
    } else {
      const { data, error } = await supabase
        .from('clinical_consents')
        .select('*, patient:profiles!clinical_consents_patient_id_fkey(id, full_name, business_name)')
        .eq('provider_id', userId)
        .eq('status', 'active');
      if (error) { setFallo(true); setLoading(false); return; }
      setFallo(false);
      setAccessTo(
        (data ?? []).map((c) => {
          const pt = c.patient as unknown as { id: string; full_name: string | null; business_name: string | null };
          return { ...c, patient: { id: pt.id, name: pt.business_name || pt.full_name || '' } };
        }),
      );
    }
    setLoading(false);
  }, [userId, isConsumer]);

  useEffect(() => { void load(); }, [load]);

  const grant = useCallback(async (providerId: string): Promise<Result<true>> => {
    if (!userId) return { ok: false, error: 'Sin sesión' };
    const { error } = await supabase
      .from('clinical_consents')
      .upsert({ patient_id: userId, provider_id: providerId, status: 'active', revoked_at: null }, { onConflict: 'patient_id,provider_id' });
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [userId, load]);

  const revoke = useCallback(async (providerId: string): Promise<Result<true>> => {
    if (!userId) return { ok: false, error: 'Sin sesión' };
    const { error } = await supabase
      .from('clinical_consents')
      .update({ status: 'revoked', revoked_at: new Date().toISOString() })
      .eq('patient_id', userId)
      .eq('provider_id', providerId);
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [userId, load]);

  return { granted, accessTo, connections, loading, fallo, reload: load, grant, revoke };
}

// ── Expediente concreto ────────────────────────────────────────────────────────
export function useClinicalRecord(patientId: string, providerId?: string) {
  const { userId, isConsumer } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [falloExpediente, setFalloExpediente] = useState(false);

  // Para el chat: el "hilo" es (patient, provider). Si el usuario es el especialista, es él.
  const threadProvider = isConsumer ? providerId : userId;

  const load = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    const [e, t] = await Promise.all([
      supabase.from('clinical_entries').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
      supabase.from('home_tasks').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
    ]);
    // Un expediente clinico que se ve vacio porque fallo la consulta es lo
    // ultimo que puede pasar aqui: quien lo consulta concluiria que no hay
    // antecedentes. (Repaso adversario, 20 oct 2026.)
    if (e.error || t.error) { setFalloExpediente(true); setLoading(false); return; }
    setFalloExpediente(false);
    setEntries(e.data ?? []);
    setTasks(t.data ?? []);
    if (threadProvider) {
      const { data, error } = await supabase
        .from('clinical_messages')
        .select('*')
        .eq('patient_id', patientId)
        .eq('provider_id', threadProvider)
        .order('created_at');
      if (error) { setFalloExpediente(true); setLoading(false); return; }
      setMessages(data ?? []);
    }
    setLoading(false);
  }, [patientId, threadProvider]);

  useEffect(() => { void load(); }, [load]);

  const addEntry = useCallback(async (e: { kind: 'note' | 'report'; title: string; body: string; period?: string }): Promise<Result<true>> => {
    if (!userId) return { ok: false, error: 'Sin sesión' };
    const { error } = await supabase.from('clinical_entries').insert({ patient_id: patientId, author_id: userId, ...e });
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [userId, patientId, load]);

  const addTask = useCallback(async (tk: { title: string; detail?: string; due_date?: string }): Promise<Result<true>> => {
    if (!userId) return { ok: false, error: 'Sin sesión' };
    const { error } = await supabase.from('home_tasks').insert({ patient_id: patientId, provider_id: userId, ...tk });
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [userId, patientId, load]);

  const toggleTask = useCallback(async (id: string, completed: boolean): Promise<Result<true>> => {
    const { error } = await supabase
      .from('home_tasks')
      .update({ completed, completed_at: completed ? new Date().toISOString() : null })
      .eq('id', id);
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [load]);

  const sendMessage = useCallback(async (body: string): Promise<Result<true>> => {
    if (!userId || !threadProvider) return { ok: false, error: 'Sin hilo' };
    const { error } = await supabase
      .from('clinical_messages')
      .insert({ patient_id: patientId, provider_id: threadProvider, sender_id: userId, body });
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [userId, threadProvider, patientId, load]);

  return { entries, tasks, messages, loading, fallo: falloExpediente, reload: load, addEntry, addTask, toggleTask, sendMessage };
}
