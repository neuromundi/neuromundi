/**
 * useMyJobs — vacantes propias de una empresa inclusiva (CRUD). RLS: cada empresa
 * solo puede ver/editar las suyas; las activas son públicas vía la RPC public_jobs.
 * useMemberBadges — distintivos activos que el admin subió para un tipo de miembro.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type JobOpening = Tables<'job_openings'>;
export type JobPatch = Partial<Omit<JobOpening, 'id' | 'company_id' | 'created_at' | 'updated_at'>>;

export function useMyJobs(companyId: string | null | undefined) {
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!companyId) { setJobs([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('job_openings')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    setJobs((data as JobOpening[] | null) ?? []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (patch: JobPatch): Promise<boolean> => {
    if (!companyId) return false;
    const { error } = await supabase.from('job_openings').insert({ ...patch, company_id: companyId });
    if (error) return false;
    await load();
    return true;
  }, [companyId, load]);

  const update = useCallback(async (id: string, patch: JobPatch): Promise<boolean> => {
    const { error } = await supabase.from('job_openings').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return false;
    await load();
    return true;
  }, [load]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('job_openings').delete().eq('id', id);
    if (error) return false;
    await load();
    return true;
  }, [load]);

  return { jobs, loading, reload: load, create, update, remove };
}

export type OpportunityType = 'employment' | 'volunteering' | 'social_service';

export interface PublicJob {
  id: string;
  company_name: string;
  company_id: string;
  opportunity_type: OpportunityType;
  positions: number | null;
  title: string | null;
  experience: string | null;
  education: string | null;
  salary_text: string | null;
  country: string | null;
  city: string | null;
  skills: string | null;
  apply_email: string | null;
  apply_url: string | null;
  note: string | null;
  created_at: string;
}

/** Oportunidades públicas (activas). `country` y `type` filtran; null = todos. */
export function usePublicJobs(country?: string | null, type?: OpportunityType | null) {
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.rpc('public_jobs', { p_country: country ?? null, p_type: type ?? null });
      if (alive) {
        setJobs(error ? [] : ((data as PublicJob[] | null) ?? []));
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [country, type]);

  return { jobs, loading };
}

/** Países con al menos una vacante activa (para el selector). */
export function usePublicJobsCountries() {
  const [countries, setCountries] = useState<{ country: string; n: number }[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase.rpc('public_jobs_countries');
      if (alive) setCountries(error ? [] : ((data as { country: string; n: number }[] | null) ?? []));
    })();
    return () => { alive = false; };
  }, []);
  return { countries };
}

export interface MemberBadge {
  id: string;
  member_type: string;
  badge_key: string;
  title: string | null;
  public_url: string | null;
}

/** Distintivos activos disponibles para un tipo de miembro (para descargar). */
export function useMemberBadges(memberType: string | null | undefined) {
  const [badges, setBadges] = useState<MemberBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!memberType) { setBadges([]); setLoading(false); return; }
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from('member_badges')
        .select('id, member_type, badge_key, title, public_url')
        .eq('member_type', memberType)
        .eq('is_active', true);
      if (alive) {
        setBadges((data as MemberBadge[] | null) ?? []);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [memberType]);

  return { badges, loading };
}
