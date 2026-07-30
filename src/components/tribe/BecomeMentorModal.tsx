/**
 * BecomeMentorModal — ofrecerse como mentor de pares: elige una o ambas vías
 * (ND→ND, Familia→Familia) y escribe una breve presentación.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, useToast } from '@/components/ui';
import { useMyMentor, MENTOR_TRACKS, type MentorTrack, type MyMentor } from '@/hooks/useTribeMentorship';

export function BecomeMentorModal({ current, onClose, onSaved }: { current: MyMentor | null; onClose: () => void; onSaved?: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { become } = useMyMentor();
  const [tracks, setTracks] = useState<MentorTrack[]>(current?.tracks ?? []);
  const [bio, setBio] = useState(current?.bio ?? '');
  const [busy, setBusy] = useState(false);

  const toggle = (tr: MentorTrack) => setTracks((p) => (p.includes(tr) ? p.filter((x) => x !== tr) : [...p, tr]));

  const submit = async () => {
    if (tracks.length === 0) { toast.error(t('tribe.mentor.pickTrack')); return; }
    setBusy(true);
    const err = await become(tracks, bio.trim());
    setBusy(false);
    if (err) toast.error(err);
    else { toast.success(t('tribe.mentor.offered')); onSaved?.(); onClose(); }
  };

  return (
    <Modal open onClose={onClose} title={t('tribe.mentor.becomeTitle')} footer={<Button onClick={submit} loading={busy} disabled={tracks.length === 0}>{t('tribe.mentor.save')}</Button>}>
      <div className="space-y-4">
        <p className="text-sm text-muted">{t('tribe.mentor.becomeIntro')}</p>
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-900">{t('tribe.mentor.tracks')}</p>
          <div className="space-y-2">
            {MENTOR_TRACKS.map((tr) => (
              <label key={tr} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
                <input type="checkbox" checked={tracks.includes(tr)} onChange={() => toggle(tr)} className="mt-0.5 h-5 w-5 rounded border-slate-300 text-brand-500" />
                <span><span className="font-semibold text-slate-900">{t(`tribe.mentor.track.${tr}`)}</span> — {t(`tribe.mentor.trackDesc.${tr}`)}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-900">{t('tribe.mentor.bioLabel')}</label>
          <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={400}
            className="w-full rounded-xl border border-slate-200 p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            placeholder={t('tribe.mentor.bioPh')} />
        </div>
      </div>
    </Modal>
  );
}
