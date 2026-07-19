/**
 * useAcademy — Fase 7 (LMS).
 *  - useAcademy: catálogo de cursos publicados + mis inscripciones + inscribirme.
 *  - useCourse(id): detalle (módulos→lecciones), inscripción, progreso y marcar
 *    lecciones completadas (aula virtual).
 *  - useCourseAuthor: el instructor crea cursos, módulos y lecciones y publica.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useCountry } from '@/stores/countryStore';
import { toMessage } from '@/lib/utils';
import type { Tables } from '@/types/database';
import type { Result } from '@/types/app';

export type Course = Tables<'courses'>;
export type Module = Tables<'course_modules'>;
export type Lesson = Tables<'course_lessons'>;

// ── Catálogo ───────────────────────────────────────────────────────────────────
export function useAcademy() {
  const { userId } = useAuth();
  const { country } = useCountry();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    // Academy segmentada por país en el SERVIDOR vía la vista courses_public
    // (país del curso o, si es nulo, país del autor).
    let q = supabase.from('courses_public').select('*').eq('is_published', true).order('created_at', { ascending: false });
    if (country) q = q.eq('effective_country', country);
    const { data } = await q;
    setCourses((data ?? []) as Course[]);
    if (userId) {
      const { data: en } = await supabase.from('course_enrollments').select('course_id').eq('user_id', userId);
      setEnrolledIds(new Set((en ?? []).map((e) => e.course_id)));
    }
    setLoading(false);
  }, [userId, country]);

  useEffect(() => { void load(); }, [load]);

  const enroll = useCallback(async (courseId: string): Promise<Result<true>> => {
    if (!userId) return { ok: false, error: 'Sin sesión' };
    const { error } = await supabase.from('course_enrollments').upsert({ course_id: courseId, user_id: userId }, { onConflict: 'course_id,user_id' });
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [userId, load]);

  return { courses, enrolledIds, loading, enroll };
}

// ── Curso / aula ─────────────────────────────────────────────────────────────
export interface ModuleWithLessons extends Module { lessons: Lesson[] }

export function useCourse(courseId: string) {
  const { userId } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<ModuleWithLessons[]>([]);
  const [enrolled, setEnrolled] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    const { data: c } = await supabase.from('courses').select('*').eq('id', courseId).single();
    setCourse(c ?? null);

    const { data: mods } = await supabase.from('course_modules').select('*').eq('course_id', courseId).order('position');
    const modIds = (mods ?? []).map((m) => m.id);
    let lessons: Lesson[] = [];
    if (modIds.length > 0) {
      const { data: les } = await supabase.from('course_lessons').select('*').in('module_id', modIds).order('position');
      lessons = les ?? [];
    }
    setModules((mods ?? []).map((m) => ({ ...m, lessons: lessons.filter((l) => l.module_id === m.id) })));

    if (userId) {
      const { data: en } = await supabase.from('course_enrollments').select('id').eq('course_id', courseId).eq('user_id', userId).maybeSingle();
      setEnrolled(!!en);
      const lessonIds = lessons.map((l) => l.id);
      if (lessonIds.length > 0) {
        const { data: comp } = await supabase.from('lesson_completions').select('lesson_id').eq('user_id', userId).in('lesson_id', lessonIds);
        setCompleted(new Set((comp ?? []).map((x) => x.lesson_id)));
      }
    }
    setLoading(false);
  }, [courseId, userId]);

  useEffect(() => { void load(); }, [load]);

  const enroll = useCallback(async (): Promise<Result<true>> => {
    if (!userId) return { ok: false, error: 'Sin sesión' };
    const { error } = await supabase.from('course_enrollments').upsert({ course_id: courseId, user_id: userId }, { onConflict: 'course_id,user_id' });
    if (error) return { ok: false, error: toMessage(error) };
    setEnrolled(true);
    return { ok: true, data: true };
  }, [userId, courseId]);

  const toggleLesson = useCallback(async (lessonId: string, done: boolean): Promise<Result<true>> => {
    if (!userId) return { ok: false, error: 'Sin sesión' };
    if (done) {
      const { error } = await supabase.from('lesson_completions').upsert({ user_id: userId, lesson_id: lessonId }, { onConflict: 'user_id,lesson_id' });
      if (error) return { ok: false, error: toMessage(error) };
      setCompleted((p) => new Set(p).add(lessonId));
    } else {
      await supabase.from('lesson_completions').delete().eq('user_id', userId).eq('lesson_id', lessonId);
      setCompleted((p) => { const n = new Set(p); n.delete(lessonId); return n; });
    }
    return { ok: true, data: true };
  }, [userId]);

  const totalLessons = modules.reduce((n, m) => n + m.lessons.length, 0);
  const progress = totalLessons === 0 ? 0 : Math.round((completed.size / totalLessons) * 100);

  return { course, modules, enrolled, completed, progress, totalLessons, loading, enroll, toggleLesson };
}

// ── Autoría ────────────────────────────────────────────────────────────────────
export function useCourseAuthor() {
  const { userId } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from('courses').select('*').eq('author_id', userId).order('created_at', { ascending: false });
    setCourses(data ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const createCourse = useCallback(async (c: { title: string; description?: string; level?: string; audience?: string | null; cover_url?: string }): Promise<Result<string>> => {
    if (!userId) return { ok: false, error: 'Sin sesión' };
    const { data, error } = await supabase.from('courses').insert({ author_id: userId, ...c }).select('id').single();
    if (error || !data) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: data.id };
  }, [userId, load]);

  const updateCourse = useCallback(async (id: string, patch: { level?: string | null; audience?: string | null; title?: string; description?: string; cover_url?: string }): Promise<Result<true>> => {
    const { error } = await supabase.from('courses').update(patch).eq('id', id);
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [load]);

  const togglePublish = useCallback(async (id: string, is_published: boolean): Promise<Result<true>> => {
    const { error } = await supabase.from('courses').update({ is_published }).eq('id', id);
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [load]);

  const remove = useCallback(async (id: string): Promise<Result<true>> => {
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [load]);

  const addModule = useCallback(async (courseId: string, title: string, position: number): Promise<Result<string>> => {
    const { data, error } = await supabase.from('course_modules').insert({ course_id: courseId, title, position }).select('id').single();
    if (error || !data) return { ok: false, error: toMessage(error) };
    return { ok: true, data: data.id };
  }, []);

  const addLesson = useCallback(async (moduleId: string, l: { title: string; content?: string; video_url?: string; position: number; duration_min?: number }): Promise<Result<true>> => {
    const { error } = await supabase.from('course_lessons').insert({ module_id: moduleId, ...l });
    if (error) return { ok: false, error: toMessage(error) };
    return { ok: true, data: true };
  }, []);

  return { courses, loading, reload: load, createCourse, updateCourse, togglePublish, remove, addModule, addLesson };
}
