import { describe, it, expect } from 'vitest';
import {
  filterEvents, groupItemsByDay, buildMonthCells,
  toLocalDatetimeInput, eventToCalendarEvent, itemToCalendarEvent,
} from './calendarView';
import type { EventItem } from '@/hooks/useEvents';
import type { CalendarItem } from '@/hooks/useCalendar';

function ev(p: Partial<EventItem>): EventItem {
  return {
    id: p.id ?? 'e1', title: p.title ?? 'Taller', description: p.description ?? null,
    category: p.category ?? 'workshop', is_online: p.is_online ?? false, online_url: p.online_url ?? null,
    country: p.country ?? 'México', city: p.city ?? 'CDMX', venue: p.venue ?? 'Centro',
    starts_at: p.starts_at ?? '2025-01-15T12:00:00.000Z', ends_at: p.ends_at ?? null,
    cover_url: p.cover_url ?? null, is_published: p.is_published ?? true,
  };
}
function item(p: Partial<CalendarItem>): CalendarItem {
  return {
    key: p.key ?? 'c1', title: p.title ?? 'Cita', starts_at: p.starts_at ?? '2025-01-15T12:00:00.000Z',
    ends_at: p.ends_at ?? null, location: p.location ?? null, online_url: p.online_url ?? null,
    kind: p.kind ?? 'personal', editable: p.editable ?? true, entryId: p.entryId ?? 'x',
  };
}

describe('eventMatchesFilter / filterEvents', () => {
  const presencialMx = ev({ id: 'a', country: 'México', is_online: false, title: 'Yoga adaptado' });
  const presencialAr = ev({ id: 'b', country: 'Argentina', is_online: false, title: 'Charla TEA' });
  const online = ev({ id: 'c', is_online: true, country: null, title: 'Webinar sensorial' });
  const all = [presencialMx, presencialAr, online];

  it('modo presencial excluye los online y viceversa', () => {
    expect(filterEvents(all, { mode: 'presencial', country: null, term: '' }).map((e) => e.id)).toEqual(['a', 'b']);
    expect(filterEvents(all, { mode: 'online', country: null, term: '' }).map((e) => e.id)).toEqual(['c']);
  });

  it('el país filtra presenciales pero NO los online', () => {
    const r = filterEvents(all, { mode: 'all', country: 'México', term: '' }).map((e) => e.id);
    expect(r).toContain('a');   // presencial MX
    expect(r).toContain('c');   // online (no se acota por país)
    expect(r).not.toContain('b'); // presencial AR
  });

  it('el texto busca en título/descr/ciudad/lugar, sin distinguir mayúsculas', () => {
    expect(filterEvents(all, { mode: 'all', country: null, term: 'WEBINAR' }).map((e) => e.id)).toEqual(['c']);
    expect(filterEvents(all, { mode: 'all', country: null, term: 'nada-coincide' })).toHaveLength(0);
  });
});

describe('groupItemsByDay', () => {
  it('agrupa por día natural conservando el orden', () => {
    const items = [
      item({ key: '1', starts_at: '2025-01-15T09:00:00.000Z' }),
      item({ key: '2', starts_at: '2025-01-15T18:00:00.000Z' }),
      item({ key: '3', starts_at: '2025-01-16T08:00:00.000Z' }),
    ];
    const g = groupItemsByDay(items);
    expect(g).toHaveLength(2);
    expect(g[0].day).toBe('2025-01-15');
    expect(g[0].items.map((i) => i.key)).toEqual(['1', '2']);
    expect(g[1].day).toBe('2025-01-16');
  });

  it('lista vacía → sin grupos', () => {
    expect(groupItemsByDay([])).toEqual([]);
  });
});

describe('buildMonthCells', () => {
  it('coloca el relleno inicial (lunes primero) y ubica la entrada en su celda', () => {
    // Enero 2025: el día 1 es miércoles → 2 celdas de relleno (lun, mar).
    const it15 = item({ key: 'd15', starts_at: '2025-01-15T12:00:00.000Z' });
    const cells = buildMonthCells(2025, 0, [it15]);
    expect(cells[0].date).toBeNull();
    expect(cells[1].date).toBeNull();
    expect(cells[2].date?.getDate()).toBe(1);
    // día 15 → índice 2 (relleno) + 14 = 16
    expect(cells[16].date?.getDate()).toBe(15);
    expect(cells[16].items.map((i) => i.key)).toEqual(['d15']);
    // total = 2 relleno + 31 días
    expect(cells).toHaveLength(33);
  });
});

describe('toLocalDatetimeInput', () => {
  it('formatea a YYYY-MM-DDTHH:mm', () => {
    expect(toLocalDatetimeInput('2025-01-15T09:30:00.000Z')).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d$/);
  });
  it('vacío o inválido → cadena vacía', () => {
    expect(toLocalDatetimeInput(null)).toBe('');
    expect(toLocalDatetimeInput('no-es-fecha')).toBe('');
  });
});

describe('eventToCalendarEvent / itemToCalendarEvent', () => {
  it('evento presencial arma la ubicación con lugar, ciudad y país', () => {
    const c = eventToCalendarEvent(ev({ is_online: false, venue: 'Sala A', city: 'CDMX', country: 'México' }));
    expect(c.location).toBe('Sala A, CDMX, México');
  });
  it('evento en línea usa el enlace como ubicación', () => {
    const c = eventToCalendarEvent(ev({ is_online: true, online_url: 'https://meet.x/abc', venue: null, city: null, country: null }));
    expect(c.location).toBe('https://meet.x/abc');
  });
  it('sin fin, asume 1 hora de duración', () => {
    const c = eventToCalendarEvent(ev({ starts_at: '2025-01-15T10:00:00.000Z', ends_at: null }));
    expect(c.endsAt).toBe('2025-01-15T11:00:00.000Z');
  });
  it('entrada usa location o, si no, el enlace en línea', () => {
    expect(itemToCalendarEvent(item({ location: 'Casa', online_url: null })).location).toBe('Casa');
    expect(itemToCalendarEvent(item({ location: null, online_url: 'https://z' })).location).toBe('https://z');
  });
});
