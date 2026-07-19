/**
 * calendarView — lógica pura (sin React ni red) de la sección Eventos y del
 * Calendario personal. Se extrae aquí para poder probarla con unit tests:
 *   - filtrado de eventos por modalidad / país / texto,
 *   - agrupación de entradas por día (vista agenda),
 *   - construcción de las celdas del mes (vista cuadrícula, lunes primero),
 *   - conversión de fecha ISO a valor de <input type="datetime-local">,
 *   - conversión de evento/entrada al formato CalendarEvent (.ics / Google).
 */
import type { EventItem } from '@/hooks/useEvents';
import type { CalendarItem } from '@/hooks/useCalendar';
import type { CalendarEvent } from '@/lib/calendar';

export type EventMode = 'all' | 'presencial' | 'online';

export interface EventFilter {
  mode: EventMode;
  country: string | null;
  term: string;
}

/** ¿El evento pasa el filtro actual? Los eventos en línea no se acotan por país. */
export function eventMatchesFilter(ev: EventItem, f: EventFilter): boolean {
  if (f.mode === 'online' && !ev.is_online) return false;
  if (f.mode === 'presencial' && ev.is_online) return false;
  if (f.country && !ev.is_online && ev.country !== f.country) return false;
  const needle = (f.term ?? '').trim().toLowerCase();
  if (needle) {
    const hay = `${ev.title} ${ev.description ?? ''} ${ev.city ?? ''} ${ev.venue ?? ''}`.toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  return true;
}

export function filterEvents(events: EventItem[], f: EventFilter): EventItem[] {
  return events.filter((ev) => eventMatchesFilter(ev, f));
}

export interface DayGroup {
  day: string; // YYYY-MM-DD
  iso: string; // primera fecha del grupo (para formatear el encabezado)
  items: CalendarItem[];
}

/** Agrupa las entradas por día natural (según la parte de fecha del ISO). */
export function groupItemsByDay(items: CalendarItem[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const it of items) {
    const dayKey = it.starts_at.slice(0, 10);
    let bucket = groups.find((g) => g.day === dayKey);
    if (!bucket) { bucket = { day: dayKey, iso: it.starts_at, items: [] }; groups.push(bucket); }
    bucket.items.push(it);
  }
  return groups;
}

export interface MonthCell {
  date: Date | null; // null = relleno antes del día 1
  items: CalendarItem[];
}

/** Celdas del mes (year, month base 0), con relleno inicial y lunes primero. */
export function buildMonthCells(year: number, month: number, items: CalendarItem[]): MonthCell[] {
  const first = new Date(year, month, 1);
  const startWeekday = (first.getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: MonthCell[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ date: null, items: [] });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dayKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ date, items: items.filter((it) => it.starts_at.slice(0, 10) === dayKey) });
  }
  return cells;
}

/** ISO → 'YYYY-MM-DDTHH:mm' en hora local (para <input type="datetime-local">). */
export function toLocalDatetimeInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Si no hay fin, asume 1 hora de duración (en ms) sobre el inicio. */
function defaultEnd(startIso: string, endIso: string | null | undefined): string {
  if (endIso) return endIso;
  return new Date(new Date(startIso).getTime() + 3600000).toISOString();
}

/** Evento de la comunidad → CalendarEvent para exportar (.ics / Google). */
export function eventToCalendarEvent(ev: EventItem): CalendarEvent {
  const location = ev.is_online
    ? (ev.online_url ?? '')
    : [ev.venue, ev.city, ev.country].filter(Boolean).join(', ');
  return {
    title: ev.title,
    startsAt: ev.starts_at,
    endsAt: defaultEnd(ev.starts_at, ev.ends_at),
    description: ev.description ?? '',
    location,
  };
}

/** Entrada del calendario personal → CalendarEvent para exportar. */
export function itemToCalendarEvent(it: CalendarItem): CalendarEvent {
  return {
    title: it.title || '',
    startsAt: it.starts_at,
    endsAt: defaultEnd(it.starts_at, it.ends_at),
    location: it.location ?? it.online_url ?? '',
  };
}
