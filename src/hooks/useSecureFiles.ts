/**
 * useSecureFiles — intercambio de archivos cifrado de extremo a extremo (Fase 5).
 * El archivo se cifra en el navegador antes de subir; el servidor solo guarda
 * cifrado + las llaves AES envueltas por destinatario. La descarga descifra local.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toMessage } from '@/lib/utils';
import { ensureKeyPair, encryptForRecipients, decryptFile } from '@/lib/crypto';
import type { Tables } from '@/types/database';
import type { Result } from '@/types/app';

export type SecureFile = Tables<'secure_files'>;

const DAY_MS = 86400000;

export function useSecureFiles(patientId: string) {
  const { userId } = useAuth();
  const [files, setFiles] = useState<SecureFile[]>([]);
  const [loading, setLoading] = useState(true);

  // Publica la llave pública del usuario si aún no está (necesaria para recibir).
  useEffect(() => {
    (async () => {
      if (!userId) return;
      const { publicKeyB64 } = await ensureKeyPair();
      const { data } = await supabase.from('profiles').select('public_key').eq('id', userId).single();
      if (data && !data.public_key) await supabase.from('profiles').update({ public_key: publicKeyB64 }).eq('id', userId);
    })();
  }, [userId]);

  const load = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    const { data } = await supabase.from('secure_files').select('*').eq('patient_id', patientId).order('created_at', { ascending: false });
    setFiles(data ?? []);
    setLoading(false);
  }, [patientId]);

  useEffect(() => { void load(); }, [load]);

  /** Cifra y sube un archivo para una lista de destinatarios (perfiles con public_key). */
  const upload = useCallback(
    async (file: File, recipientIds: string[], expiresInDays?: number): Promise<Result<true>> => {
      if (!userId) return { ok: false, error: 'Sin sesión' };
      // Los destinatarios incluyen siempre al emisor (para poder releer su propio envío).
      const ids = Array.from(new Set([userId, ...recipientIds]));
      const { data: keys } = await supabase.from('profiles').select('id, public_key').in('id', ids);
      const recipients = (keys ?? []).filter((k) => k.public_key).map((k) => ({ id: k.id, publicKeyB64: k.public_key as string }));
      if (recipients.length === 0) return { ok: false, error: 'Ningún destinatario tiene llave pública aún.' };

      let enc;
      try {
        enc = await encryptForRecipients(file, recipients);
      } catch (e) {
        return { ok: false, error: toMessage(e, 'No se pudo cifrar el archivo.') };
      }

      const path = `${userId}/${crypto.randomUUID()}.enc`;
      const up = await supabase.storage.from('secure').upload(path, enc.ciphertext, { contentType: 'application/octet-stream' });
      if (up.error) return { ok: false, error: toMessage(up.error) };

      const { data: row, error } = await supabase
        .from('secure_files')
        .insert({
          owner_id: userId,
          patient_id: patientId,
          filename: file.name,
          mime: file.type || null,
          storage_path: path,
          iv: enc.ivB64,
          expires_at: expiresInDays ? new Date(Date.now() + expiresInDays * DAY_MS).toISOString() : null,
        })
        .select('id')
        .single();
      if (error || !row) {
        await supabase.storage.from('secure').remove([path]);
        return { ok: false, error: toMessage(error) };
      }

      const keyRows = enc.wrapped.map((w) => ({ file_id: row.id, recipient_id: w.recipientId, wrapped_key: w.wrappedKeyB64 }));
      const { error: kerr } = await supabase.from('secure_file_keys').insert(keyRows);
      if (kerr) return { ok: false, error: toMessage(kerr) };

      await load();
      return { ok: true, data: true };
    },
    [userId, patientId, load],
  );

  /** Descarga y descifra un archivo en el navegador, disparando su guardado. */
  const download = useCallback(
    async (f: SecureFile): Promise<Result<true>> => {
      if (!userId) return { ok: false, error: 'Sin sesión' };
      const { data: keyRow } = await supabase
        .from('secure_file_keys')
        .select('wrapped_key')
        .eq('file_id', f.id)
        .eq('recipient_id', userId)
        .maybeSingle();
      if (!keyRow) return { ok: false, error: 'No tienes llave para este archivo.' };

      const dl = await supabase.storage.from('secure').download(f.storage_path);
      if (dl.error || !dl.data) return { ok: false, error: toMessage(dl.error, 'No se pudo descargar.') };

      try {
        const plain = await decryptFile(await dl.data.arrayBuffer(), keyRow.wrapped_key, f.iv);
        const blob = new Blob([plain], { type: f.mime || 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = f.filename;
        a.click();
        URL.revokeObjectURL(url);
        return { ok: true, data: true };
      } catch (e) {
        return { ok: false, error: toMessage(e, 'No se pudo descifrar (¿es este el dispositivo con tu llave?).') };
      }
    },
    [userId],
  );

  const remove = useCallback(async (f: SecureFile): Promise<Result<true>> => {
    await supabase.storage.from('secure').remove([f.storage_path]);
    const { error } = await supabase.from('secure_files').delete().eq('id', f.id);
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [load]);

  return { files, loading, reload: load, upload, download, remove };
}
