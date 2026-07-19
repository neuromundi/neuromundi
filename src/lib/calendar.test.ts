import { describe, it, expect } from 'vitest';
import { buildICS, googleCalendarUrl, type CalendarEvent } from './calendar';

const base: CalendarEvent = {
  title: 'Terapia',
  startsAt: '2025-01-15T10:00:00.000Z',
  endsAt: '2025-01-15T11:00:00.000Z',
};

describe('buildICS', () => {
  it('genera un VCALENDAR/VEVENT con fechas UTC compactas (happy path)', () => {
    const ics = buildICS(base);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('SUMMARY:Terapia');
    expect(ics).toContain('DTSTART:20250115T100000Z');
    expect(ics).toContain('DTEND:20250115T110000Z');
  });

  it('escapa comas, puntos y coma y saltos de línea', () => {
    const ics = buildICS({ ...base, title: 'A, B; C', description: 'Línea1\nLínea2' });
    expect(ics).toContain('SUMMARY:A\\, B\\; C');
    expect(ics).toContain('DESCRIPTION:Línea1\\nLínea2');
  });

  it('omite DESCRIPTION y LOCATION cuando están vacíos (error/edge path)', () => {
    const ics = buildICS(base);
    expect(ics).not.toContain('DESCRIPTION:');
    expect(ics).not.toContain('LOCATION:');
  });

  it('incluye LOCATION cuando se provee', () => {
    const ics = buildICS({ ...base, location: 'Clínica Centro' });
    expect(ics).toContain('LOCATION:Clínica Centro');
  });
});

describe('googleCalendarUrl', () => {
  it('arma el enlace de plantilla con rango de fechas y campos', () => {
    const url = googleCalendarUrl({ ...base, description: 'desc', location: 'lugar' });
    expect(url.startsWith('https://calendar.google.com/calendar/render?')).toBe(true);
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('text=Terapia');
    // El rango va como START/END (la barra queda codificada como %2F).
    expect(url).toContain('dates=20250115T100000Z%2F20250115T110000Z');
    expect(url).toContain('details=desc');
    expect(url).toContain('location=lugar');
  });
});
