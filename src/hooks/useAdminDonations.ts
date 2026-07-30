/**
 * useAdminDonations — datos de donaciones para el panel de admin: estadística,
 * lista y gestión del muro. useAdminAllies — CRUD de los aliados del carrusel.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Ally } from '@/hooks/useDonorWall';

export interface DonationStat {
  currency: string;
  paid_count: number;
  paid_cents: number;
  wall_published: number;
  physical_pending: number;
}

export interface AdminDonation {
  id: string;
  created_at: string;
  paid_at: string | null;
  status: string;
  level: string;
  amount_cents: number;
  currency: string;
  is_company: boolean;
  contact_name: string;
  org_name: string | null;
  email: string;
  publish_consent: boolean;
  publish_as: string | null;
  wall_published: boolean;
  wall_featured: boolean;
  wall_note: string | null;
  wall_logo_url: string | null;
  waive_physical: boolean;
  ship_use_registered: boolean;
  ship_recipient: string | null;
  ship_address: string | null;
  ship_city: string | null;
  ship_postal: string | null;
  ship_country: string | null;
}

export function useAdminDonations(status?: string) {
  const [stats, setStats] = useState<DonationStat[]>([]);
  const [rows, setRows] = useState<AdminDonation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, l] = await Promise.all([
      supabase.rpc('admin_donation_stats'),
      supabase.rpc('admin_donations', { p_status: status ?? null }),
    ]);
    setStats((s.data as DonationStat[] | null) ?? []);
    setRows((l.data as AdminDonation[] | null) ?? []);
    setLoading(false);
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  /** Publica / edita / quita / destaca una donación en el muro. */
  const setWall = useCallback(
    async (
      id: string,
      opts: { published: boolean; featured?: boolean; publishAs?: string; note?: string; logoUrl?: string },
    ): Promise<{ ok: boolean; error?: string }> => {
      const { data, error } = await supabase.rpc('admin_set_donation_wall', {
        p_id: id,
        p_published: opts.published,
        p_featured: opts.featured ?? false,
        p_publish_as: opts.publishAs ?? null,
        p_note: opts.note ?? null,
        p_logo_url: opts.logoUrl ?? null,
      });
      if (error) return { ok: false, error: error.message };
      const r = data as { ok?: boolean; error?: string };
      if (r?.ok) await load();
      return { ok: r?.ok === true, error: r?.error };
    },
    [load],
  );

  return { stats, rows, loading, reload: load, setWall };
}

export function useAdminAllies() {
  const [allies, setAllies] = useState<Ally[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('allies').select('*').order('sort_order', { ascending: true });
    setAllies((data as Ally[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = useCallback(
    async (a: Partial<Ally> & { name: string; logo_url: string }): Promise<boolean> => {
      const payload = {
        name: a.name,
        logo_url: a.logo_url,
        website: a.website ?? null,
        sort_order: a.sort_order ?? 0,
        is_active: a.is_active ?? true,
        countries: a.countries && a.countries.length > 0 ? a.countries : null,
      };
      const { error } = a.id
        ? await supabase.from('allies').update(payload).eq('id', a.id)
        : await supabase.from('allies').insert(payload);
      if (!error) await load();
      return !error;
    },
    [load],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await supabase.from('allies').delete().eq('id', id);
      if (!error) await load();
      return !error;
    },
    [load],
  );

  return { allies, loading, reload: load, save, remove };
}
