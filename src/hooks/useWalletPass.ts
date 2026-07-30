/**
 * useWalletPass — "Añadir a Apple/Google Wallet" (Neuromundi ID, Fase 3).
 *
 * Llama a la Edge Function `wallet-pass`. ANDAMIAJE: los botones solo se muestran
 * si `VITE_WALLET_ENABLED === 'true'` (se enciende cuando el backend ya tiene los
 * certificados de Apple y la cuenta de Google Wallet). Apple devuelve un binario
 * .pkpass (se descarga); Google devuelve una URL "Guardar" (se abre).
 */
import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';

export const walletEnabled = import.meta.env.VITE_WALLET_ENABLED === 'true';

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wallet-pass`;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function useWalletPass() {
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);

  const add = useCallback(async (platform: 'apple' | 'google'): Promise<{ ok: boolean; error?: string; missing?: string[] }> => {
    setBusy(platform);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return { ok: false, error: 'auth' };
      const res = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: ANON },
        body: JSON.stringify({ platform }),
      });

      if (platform === 'google') {
        const j = await res.json().catch(() => ({}));
        if (res.ok && j.saveUrl) { window.open(j.saveUrl, '_blank', 'noopener'); return { ok: true }; }
        return { ok: false, error: j.error ?? 'failed', missing: j.missing };
      }

      // Apple → binario .pkpass
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'neuromundi-id.pkpass'; a.click();
        URL.revokeObjectURL(url);
        return { ok: true };
      }
      const j = await res.json().catch(() => ({}));
      return { ok: false, error: j.error ?? 'failed', missing: j.missing };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'failed' };
    } finally {
      setBusy(null);
    }
  }, []);

  return { add, busy, enabled: walletEnabled };
}
