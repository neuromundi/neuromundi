/**
 * useAdminMemberBadges — gestión (admin) de los distintivos descargables por tipo
 * de miembro. Sube el archivo al bucket público 'badges', registra su URL en
 * member_badges y permite activarlo/desactivarlo (subir/bajar) o eliminarlo.
 * Todo acotado por RLS is_admin().
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface AdminBadge {
  id: string;
  member_type: string;
  badge_key: string;
  title: string | null;
  storage_path: string | null;
  public_url: string | null;
  is_active: boolean;
  updated_at: string;
}

export function useAdminMemberBadges() {
  const [badges, setBadges] = useState<AdminBadge[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('member_badges')
      .select('*')
      .order('member_type', { ascending: true })
      .order('badge_key', { ascending: true });
    setBadges((data as AdminBadge[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  /** Sube un archivo y crea/actualiza el distintivo (member_type + badge_key). */
  const upload = useCallback(async (memberType: string, badgeKey: string, title: string, file: File): Promise<string | null> => {
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `${memberType}/${badgeKey}-${Date.now()}.${ext}`;
    const up = await supabase.storage.from('badges').upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (up.error) return up.error.message;
    const { data: pub } = supabase.storage.from('badges').getPublicUrl(path);
    const { error } = await supabase.from('member_badges').upsert(
      { member_type: memberType, badge_key: badgeKey, title: title || null, storage_path: path, public_url: pub.publicUrl, is_active: true },
      { onConflict: 'member_type,badge_key' },
    );
    if (error) return error.message;
    await load();
    return null;
  }, [load]);

  const setActive = useCallback(async (id: string, isActive: boolean): Promise<boolean> => {
    const { error } = await supabase.from('member_badges').update({ is_active: isActive, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return false;
    await load();
    return true;
  }, [load]);

  const remove = useCallback(async (b: AdminBadge): Promise<boolean> => {
    if (b.storage_path) await supabase.storage.from('badges').remove([b.storage_path]);
    const { error } = await supabase.from('member_badges').delete().eq('id', b.id);
    if (error) return false;
    await load();
    return true;
  }, [load]);

  return { badges, loading, reload: load, upload, setActive, remove };
}
