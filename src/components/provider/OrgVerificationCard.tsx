/**
 * OrgVerificationCard — verificación documental de la organización (solo ONG).
 *
 * Para contar como Fundadora y lucir el sello de organización verificada, la ONG
 * sube su ACTA constitutiva o, en su defecto, una CARTA de manifestación como
 * organización de hecho. El administrador la aprueba o la rechaza. El archivo va
 * al bucket privado `verification`; el expediente vive en profiles.org_doc_*.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, Download, FileUp, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { openOrgLetterTemplate } from '@/lib/orgLetterTemplate';

const MAX_MB = 10;

type Estado = {
  status: 'pending' | 'approved' | 'rejected' | null;
  kind: 'acta' | 'carta' | null;
  note: string | null;
};

export function OrgVerificationCard({ userId }: { userId: string }) {
  const { t, i18n } = useTranslation();
  const toast = useToast();

  function descargarPlantilla() {
    openOrgLetterTemplate({
      brand: 'Neuromundi',
      fileTitle: t('orgletter.heading'),
      heading: t('orgletter.heading'),
      placeDate: t('orgletter.placeDate'),
      to: t('orgletter.to'),
      intro: t('orgletter.intro'),
      fOrg: t('orgletter.fOrg'),
      fRep: t('orgletter.fRep'),
      fPhone: t('orgletter.fPhone'),
      fEmail: t('orgletter.fEmail'),
      fCity: t('orgletter.fCity'),
      fCountry: t('orgletter.fCountry'),
      fPurpose: t('orgletter.fPurpose'),
      declare: t('orgletter.declare'),
      signature: t('orgletter.signature'),
      note: t('orgletter.note'),
    }, i18n.language);
  }
  const [estado, setEstado] = useState<Estado | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [kind, setKind] = useState<'acta' | 'carta'>('acta');
  const [ruta, setRuta] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const leer = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('org_doc_status, org_doc_kind, org_doc_note')
      .eq('id', userId)
      .maybeSingle();
    setEstado({
      status: (data?.org_doc_status as Estado['status']) ?? null,
      kind: (data?.org_doc_kind as Estado['kind']) ?? null,
      note: (data?.org_doc_note as string | null) ?? null,
    });
  }, [userId]);

  useEffect(() => { void leer(); }, [leer]);

  if (!estado) return null;
  const aprobada = estado.status === 'approved';
  const pendiente = estado.status === 'pending';
  const rechazada = estado.status === 'rejected';

  async function subir(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) { toast.error(t('orgdoc.tooBig', { mb: MAX_MB })); e.target.value = ''; return; }
    setSubiendo(true);
    const safe = f.name.replace(/[^\w.\-]/g, '_');
    const path = `${userId}/orgdoc-${Date.now()}-${safe}`;
    const up = await supabase.storage.from('verification').upload(path, f, { contentType: f.type || 'application/octet-stream' });
    setSubiendo(false);
    if (up.error) { toast.error(t('orgdoc.uploadError')); return; }
    setRuta(path);
    toast.success(t('orgdoc.uploaded'));
  }

  async function enviar() {
    if (!ruta) { toast.error(t('orgdoc.needFile')); return; }
    setEnviando(true);
    const { error } = await supabase.rpc('submit_org_document', { p_url: ruta, p_kind: kind });
    setEnviando(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('orgdoc.sent'));
    setAbierto(false); setRuta(null);
    void leer();
  }

  const marco = aprobada ? 'border-emerald-300 bg-emerald-50'
    : pendiente ? 'border-sky-300 bg-sky-50'
    : rechazada ? 'border-red-300 bg-red-50'
    : 'border-slate-200 bg-white';

  return (
    <section className={`mb-4 rounded-2xl border p-4 ${marco}`} aria-labelledby="orgdoc-title">
      <div className="flex items-start gap-3">
        {aprobada ? <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" aria-hidden="true" />
          : rechazada ? <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-red-700" aria-hidden="true" />
          : <BadgeCheck className="mt-0.5 h-6 w-6 shrink-0 text-slate-500" aria-hidden="true" />}
        <div className="min-w-0 flex-1">
          <h2 id="orgdoc-title" className="font-bold text-slate-900">{t('orgdoc.title')}</h2>

          {aprobada && <p className="text-sm text-emerald-800">{t('orgdoc.approved')}</p>}
          {pendiente && <p className="text-sm text-sky-800">{t('orgdoc.pending')}</p>}
          {rechazada && <p className="mt-1 text-sm text-red-800">{t('orgdoc.rejected', { motivo: estado.note ?? '' })}</p>}
          {!aprobada && !pendiente && <p className="text-sm text-slate-700">{t('orgdoc.intro')}</p>}

          {!abierto && !pendiente && (
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => setAbierto(true)}>
              {aprobada || rechazada ? t('orgdoc.resend') : t('orgdoc.start')}
            </Button>
          )}

          {abierto && (
            <div className="mt-3 flex flex-col gap-3">
              <div>
                <label htmlFor="orgdoc-kind" className="block text-sm font-semibold text-slate-800">{t('orgdoc.kind')}</label>
                <select
                  id="orgdoc-kind"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as 'acta' | 'carta')}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="acta">{t('orgdoc.kindActa')}</option>
                  <option value="carta">{t('orgdoc.kindCarta')}</option>
                </select>
                <p className="mt-1 text-xs text-muted">{t('orgdoc.kindHint')}</p>
                {kind === 'carta' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2"
                    leadingIcon={<Download className="h-4 w-4" aria-hidden="true" />}
                    onClick={descargarPlantilla}
                  >
                    {t('orgletter.download')}
                  </Button>
                )}
              </div>

              <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <FileUp className="h-4 w-4" aria-hidden="true" />
                {subiendo ? t('orgdoc.uploading') : ruta ? t('orgdoc.fileReady') : t('orgdoc.chooseFile')}
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,image/*,application/pdf" onChange={subir} />
              </label>

              <div className="flex gap-2">
                <Button size="sm" onClick={enviar} disabled={enviando || subiendo || !ruta}>
                  {enviando ? t('orgdoc.sending') : t('orgdoc.send')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setAbierto(false); setRuta(null); }}>
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
