/**
 * useReports — envío de denuncias de la comunidad.
 * Miembros: autenticados (adjuntos en su carpeta). No miembros: sin sesión,
 * con correo de contacto obligatorio (adjuntos en la carpeta 'anon'). Toda
 * denuncia es anónima frente al denunciado.
 */
import { useCallback, useState } from 'react';
import { supabase, REPORTS_BUCKET } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toMessage } from '@/lib/utils';
import type { Result } from '@/types/app';

export const REPORT_CATEGORIES = [
  'service_breach',
  'identity_theft',
  'product_piracy',
  'inappropriate',
  'fraud',
  'other',
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export interface ReportInput {
  isMember: boolean;
  reporterEmail?: string;   // obligatorio para no miembros
  reporterName?: string;    // opcional para no miembros
  reportedMemberNo: number | null;
  category: ReportCategory;
  categoryOther?: string;
  description: string;
  files: File[];
}

/** Límite defensivo de tamaño por archivo (25 MB). */
export const MAX_REPORT_FILE = 25 * 1024 * 1024;

export function useReports() {
  const { userId } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const submitReport = useCallback(
    async (input: ReportInput): Promise<Result<true>> => {
      if (input.isMember && !userId) return { ok: false, error: 'auth.required' };
      setSubmitting(true);
      try {
        const reportId = crypto.randomUUID();
        const folder = input.isMember ? (userId as string) : 'anon';
        const paths: string[] = [];
        for (const file of input.files.slice(0, 10)) {
          if (file.size > MAX_REPORT_FILE) continue;
          const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
          const path = `${folder}/${reportId}/${Date.now()}_${safe}`;
          const { error: upErr } = await supabase.storage
            .from(REPORTS_BUCKET)
            .upload(path, file, { upsert: false, contentType: file.type || undefined });
          if (upErr) return { ok: false, error: toMessage(upErr) };
          paths.push(path);
        }

        const { error } = await supabase.from('reports').insert({
          id: reportId,
          reporter_id: input.isMember ? (userId as string) : null,
          is_member: input.isMember,
          reporter_email: input.isMember ? null : (input.reporterEmail?.trim() || null),
          reporter_name: input.isMember ? null : (input.reporterName?.trim() || null),
          reported_member_no: input.reportedMemberNo,
          category: input.category,
          category_other: input.category === 'other' ? (input.categoryOther || null) : null,
          description: input.description.trim(),
          attachments: paths,
        });
        if (error) return { ok: false, error: toMessage(error) };
        return { ok: true, data: true };
      } finally {
        setSubmitting(false);
      }
    },
    [userId],
  );

  return { submitReport, submitting };
}
