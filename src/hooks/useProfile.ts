/**
 * useProfile — gestión del perfil propio.
 *
 * Encapsula toda la lógica de Supabase para AccountSettings y los dashboards:
 * actualizar datos, subir avatar a Storage, rotar el qr_token, sincronizar
 * categorías del proveedor y eliminar la cuenta. Mantiene el store de auth
 * sincronizado tras cada cambio.
 */
import { useCallback, useState } from 'react';
import { supabase, AVATAR_BUCKET } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { optimizeImageToWebp, toMessage } from '@/lib/utils';
import type { Profile, Result } from '@/types/app';
import type { TablesUpdate } from '@/types/database';

export type ProfileUpdate = TablesUpdate<'profiles'>;

export interface UseProfileValue {
  profile: Profile | null;
  saving: boolean;
  error: string | null;
  updateProfile: (patch: ProfileUpdate) => Promise<Result<Profile>>;
  uploadAvatar: (file: File) => Promise<Result<string>>;
  regenerateQrToken: () => Promise<Result<string>>;
  setCategories: (categoryIds: number[]) => Promise<Result<number[]>>;
  deleteAccount: () => Promise<Result<true>>;
}

export function useProfile(): UseProfileValue {
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const userId = useAuthStore((s) => s.user?.id ?? null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = useCallback<UseProfileValue['updateProfile']>(
    async (patch) => {
      if (!userId) return { ok: false, error: 'Sesión no disponible.' };
      setSaving(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from('profiles')
          .update(patch)
          .eq('id', userId)
          .select('*')
          .single();
        if (err) throw err;
        setProfile(data);
        return { ok: true, data };
      } catch (e) {
        const msg = toMessage(e, 'No se pudo guardar el perfil.');
        setError(msg);
        return { ok: false, error: msg };
      } finally {
        setSaving(false);
      }
    },
    [userId, setProfile],
  );

  const uploadAvatar = useCallback<UseProfileValue['uploadAvatar']>(
    async (file) => {
      if (!userId) return { ok: false, error: 'Sesión no disponible.' };
      setSaving(true);
      setError(null);
      try {
        const webp = await optimizeImageToWebp(file, { maxDimension: 512 });
        const path = `${userId}/avatar.webp`;
        const { error: upErr } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(path, webp, { upsert: true, contentType: 'image/webp' });
        if (upErr) throw upErr;

        const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
        // Cache-buster para que la UI vea el avatar nuevo de inmediato.
        const url = `${pub.publicUrl}?v=${Date.now()}`;

        const saved = await updateProfile({ avatar_url: url });
        if (!saved.ok) return saved;
        return { ok: true, data: url };
      } catch (e) {
        const msg = toMessage(e, 'No se pudo subir la imagen.');
        setError(msg);
        return { ok: false, error: msg };
      } finally {
        setSaving(false);
      }
    },
    [userId, updateProfile],
  );

  const regenerateQrToken = useCallback<UseProfileValue['regenerateQrToken']>(async () => {
    if (!userId) return { ok: false, error: 'Sesión no disponible.' };
    setSaving(true);
    setError(null);
    try {
      // gen_random_uuid() del lado del servidor sería ideal vía RPC; aquí
      // generamos en cliente con la API Web Crypto (no secuencial, no predecible).
      const newToken = crypto.randomUUID();
      const { data, error: err } = await supabase
        .from('profiles')
        .update({ qr_token: newToken })
        .eq('id', userId)
        .select('*')
        .single();
      if (err) throw err;
      setProfile(data);
      return { ok: true, data: newToken };
    } catch (e) {
      const msg = toMessage(e, 'No se pudo regenerar el código.');
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setSaving(false);
    }
  }, [userId, setProfile]);

  const setCategories = useCallback<UseProfileValue['setCategories']>(
    async (categoryIds) => {
      if (!userId) return { ok: false, error: 'Sesión no disponible.' };
      setSaving(true);
      setError(null);
      try {
        // Reemplazo total: borra las actuales e inserta las nuevas.
        const { error: delErr } = await supabase
          .from('provider_categories')
          .delete()
          .eq('provider_id', userId);
        if (delErr) throw delErr;

        if (categoryIds.length > 0) {
          const rows = categoryIds.map((category_id) => ({
            provider_id: userId,
            category_id,
          }));
          const { error: insErr } = await supabase
            .from('provider_categories')
            .insert(rows);
          if (insErr) throw insErr;
        }
        return { ok: true, data: categoryIds };
      } catch (e) {
        const msg = toMessage(e, 'No se pudieron guardar las categorías.');
        setError(msg);
        return { ok: false, error: msg };
      } finally {
        setSaving(false);
      }
    },
    [userId],
  );

  const deleteAccount = useCallback<UseProfileValue['deleteAccount']>(async () => {
    if (!userId) return { ok: false, error: 'Sesión no disponible.' };
    setSaving(true);
    setError(null);
    try {
      // El borrado real de auth.users requiere una Edge Function con
      // service_role (no se expone al cliente). Aquí invocamos esa función.
      const { error: err } = await supabase.functions.invoke('delete-account');
      if (err) throw err;
      // La cuenta ya no existe, así que el cierre 'global' contra el servidor
      // devolvería 403. Se cierra en local, que es lo único que queda por hacer.
      await supabase.auth.signOut({ scope: 'local' });
      return { ok: true, data: true };
    } catch (e) {
      const msg = toMessage(e, 'No se pudo eliminar la cuenta. Intenta más tarde.');
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setSaving(false);
    }
  }, [userId]);

  return {
    profile,
    saving,
    error,
    updateProfile,
    uploadAvatar,
    regenerateQrToken,
    setCategories,
    deleteAccount,
  };
}
