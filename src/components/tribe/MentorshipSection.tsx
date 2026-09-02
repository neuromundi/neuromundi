/**
 * MentorshipSection — Mentoría de pares en el hub de la Tribu: ofrecerse como
 * mentor, buscar mentor por vía, y gestionar mis mentorías (aceptar/rechazar y
 * abrir el hilo asíncrono).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HandHeart, Check, X, MessageSquare, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui';
import { useMyMentor, useMentors, useMyMentorships, MENTOR_TRACKS, type MentorTrack, type Mentorship } from '@/hooks/useTribeMentorship';
import { useSection } from '@/stores/sectionStore';
import { BecomeMentorModal } from './BecomeMentorModal';
import { MentorThread } from './MentorThread';

export function MentorshipSection() {
  const { t } = useTranslation();
  const { section } = useSection();
  const { mentor, setActive, reload: reloadMentor } = useMyMentor();
  const [track, setTrack] = useState<MentorTrack | ''>('');
  const { mentors, request } = useMentors(track, section);
  const { items, respond } = useMyMentorships();
  const [becoming, setBecoming] = useState(false);
  const [open, setOpen] = useState<Mentorship | null>(null);

  if (open) return <div className="mt-6"><MentorThread mentorship={open} onBack={() => setOpen(null)} /></div>;

  return (
    <section className="mt-6 rounded-2xl border border-slate-100 p-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
        <HandHeart className="h-5 w-5 text-brand-600" aria-hidden="true" /> {t('tribe.mentor.title')}
      </h2>
      <p className="mt-1 text-sm text-muted">{t('tribe.mentor.intro')}</p>

      {/* Ser mentor */}
      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
        {!mentor || mentor.tracks.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-slate-700">{t('tribe.mentor.offerPrompt')}</p>
            <Button size="sm" variant="secondary" leadingIcon={<UserPlus className="h-4 w-4" />} onClick={() => setBecoming(true)}>{t('tribe.mentor.offer')}</Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-slate-700">
              {t('tribe.mentor.youOffer')}: {mentor.tracks.map((tr) => t(`tribe.mentor.track.${tr}`)).join(' · ')}
              {!mentor.is_active && ` — ${t('tribe.mentor.paused')}`}
            </p>
            <span className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setBecoming(true)}>{t('tribe.mentor.edit')}</Button>
              <Button size="sm" variant="ghost" onClick={() => void setActive(!mentor.is_active)}>{mentor.is_active ? t('tribe.mentor.pause') : t('tribe.mentor.resume')}</Button>
            </span>
          </div>
        )}
      </div>

      {/* Mis mentorías */}
      {items.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-bold text-slate-900">{t('tribe.mentor.mine')}</h3>
          <ul className="mt-2 space-y-2">
            {items.map((ms) => (
              <li key={ms.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-white p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{ms.counterpart_name}</p>
                  <p className="text-xs text-muted">{t(`tribe.mentor.track.${ms.track}`)} · {t(`tribe.mentor.role.${ms.role}`)} · {t(`tribe.mentor.status.${ms.status}`)}</p>
                </div>
                {ms.role === 'mentor' && ms.status === 'pending' ? (
                  <span className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => void respond(ms.id, true)} className="rounded-lg bg-brand-600 p-1.5 text-white hover:bg-brand-700"><Check className="h-4 w-4" /></button>
                    <button type="button" onClick={() => void respond(ms.id, false)} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"><X className="h-4 w-4" /></button>
                  </span>
                ) : ms.status === 'active' ? (
                  <Button size="sm" variant="ghost" leadingIcon={<MessageSquare className="h-4 w-4" />} onClick={() => setOpen(ms)}>{t('tribe.mentor.openThread')}</Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Buscar mentor */}
      <div className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900">{t('tribe.mentor.find')}</h3>
          <select value={track} onChange={(e) => setTrack(e.target.value as MentorTrack | '')} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm">
            <option value="">{t('tribe.mentor.allTracks')}</option>
            {MENTOR_TRACKS.map((tr) => <option key={tr} value={tr}>{t(`tribe.mentor.track.${tr}`)}</option>)}
          </select>
        </div>
        {mentors.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{t('tribe.mentor.noMentors')}</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {mentors.map((m) => (
              <li key={m.user_id} className="rounded-xl border border-slate-100 bg-white p-3">
                <p className="font-semibold text-slate-900">{m.name}</p>
                <p className="text-xs text-muted">{m.tracks.map((tr) => t(`tribe.mentor.track.${tr}`)).join(' · ')}</p>
                {m.bio && <p className="mt-1 text-sm text-slate-600">{m.bio}</p>}
                <div className="mt-2">
                  {m.my_status === 'active' ? (
                    <span className="text-xs font-semibold text-brand-700">{t('tribe.mentor.status.active')}</span>
                  ) : m.my_status === 'pending' ? (
                    <span className="text-xs text-muted">{t('tribe.mentor.status.pending')}</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {m.tracks.map((tr) => (
                        <Button key={tr} size="sm" variant="secondary" onClick={() => void request(m.user_id, tr)}>
                          {t('tribe.mentor.request', { track: t(`tribe.mentor.track.${tr}`) })}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {becoming && <BecomeMentorModal current={mentor} onClose={() => setBecoming(false)} onSaved={() => void reloadMentor()} />}
    </section>
  );
}
