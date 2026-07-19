/**
 * calendar — utilidades para exportar una cita a calendarios externos.
 * MVP de sincronización: descarga .ics (Apple/Outlook/Google) y enlace
 * "Añadir a Google Calendar". La sincronización bidireccional real (OAuth de
 * Google / CalDAV de Apple) queda como mejora futura.
 */
const pad = (n: number) => String(n).padStart(2, '0');

/** Convierte a formato UTC compacto: YYYYMMDDTHHMMSSZ */
function toICSDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

export interface CalendarEvent {
  title: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
  description?: string;
  location?: string;
}

/** Genera el contenido de un archivo .ics para un evento. */
export function buildICS(e: CalendarEvent): string {
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@neuromundi`;
  const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Neuromundi//Agenda//ES',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toICSDate(new Date().toISOString())}`,
    `DTSTART:${toICSDate(e.startsAt)}`,
    `DTEND:${toICSDate(e.endsAt)}`,
    `SUMMARY:${esc(e.title)}`,
    e.description ? `DESCRIPTION:${esc(e.description)}` : '',
    e.location ? `LOCATION:${esc(e.location)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

/** Dispara la descarga de un .ics para la cita. */
export function downloadICS(e: CalendarEvent, filename = 'cita-neuromundi.ics'): void {
  const blob = new Blob([buildICS(e)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Enlace "Añadir a Google Calendar". */
export function googleCalendarUrl(e: CalendarEvent): string {
  const dates = `${toICSDate(e.startsAt)}/${toICSDate(e.endsAt)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates,
    details: e.description ?? '',
    location: e.location ?? '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
