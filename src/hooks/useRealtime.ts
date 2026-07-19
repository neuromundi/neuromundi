/**
 * useRealtime — suscripción declarativa a cambios de Postgres vía Supabase Realtime.
 *
 * Gestiona el ciclo de vida del canal y SIEMPRE se desuscribe en el cleanup del
 * efecto para evitar fugas de memoria (restricción crítica del spec).
 */
import { useEffect, useRef } from 'react';
import type {
  RealtimePostgresChangesPayload,
  RealtimeChannel,
} from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils';
import type { Transaction } from '@/types/app';

type PgEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface RealtimeOptions<Row extends Record<string, unknown>> {
  /** Nombre único del canal (p. ej. `transactions:<parentId>`). */
  channel: string;
  table: string;
  schema?: string;
  event?: PgEvent;
  /** Filtro Postgres, p. ej. `parent_id=eq.<id>`. */
  filter?: string;
  /** Si es false, no abre la suscripción (útil mientras no hay id). */
  enabled?: boolean;
  onChange: (payload: RealtimePostgresChangesPayload<Row>) => void;
}

/**
 * Suscripción genérica. El `onChange` se guarda en una ref para no recrear el
 * canal en cada render aunque el callback cambie de identidad.
 */
export function useRealtime<Row extends Record<string, unknown>>(
  options: RealtimeOptions<Row>,
): void {
  const {
    channel,
    table,
    schema = 'public',
    event = '*',
    filter,
    enabled = true,
    onChange,
  } = options;

  const handlerRef = useRef(onChange);
  handlerRef.current = onChange;

  useEffect(() => {
    if (!enabled) return;

    const ch: RealtimeChannel = supabase
      .channel(channel)
      .on(
        'postgres_changes',
        { event, schema, table, ...(filter ? { filter } : {}) },
        (payload: RealtimePostgresChangesPayload<Row>) => handlerRef.current(payload),
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          logger.warn(`Canal realtime con error: ${channel}`);
        }
      });

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [channel, table, schema, event, filter, enabled]);
}

/**
 * Especialización para el ParentDashboard: avisa cuando llega una transacción
 * 'pending' nueva, para abrir el modal de encuesta.
 */
export function useParentPendingTransactions(
  parentId: string | null,
  onPending: (transaction: Transaction) => void,
): void {
  useRealtime<Transaction>({
    channel: `transactions:${parentId ?? 'none'}`,
    table: 'discount_transactions',
    event: 'INSERT',
    filter: parentId ? `parent_id=eq.${parentId}` : undefined,
    enabled: !!parentId,
    onChange: (payload) => {
      const row = payload.new as Partial<Transaction>;
      if (row.id && row.status === 'pending') onPending(row as Transaction);
    },
  });
}
