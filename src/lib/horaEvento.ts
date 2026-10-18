/**
 * horaEvento — un evento ocurre en una ciudad, y esa ciudad tiene su propia hora.
 *
 * starts_at se guarda como instante (timestamptz). Si se pinta sin más, el
 * navegador lo traduce a la zona de quien mira: un congreso de Madrid a las
 * 9:00 se leía «02:00» desde México. Aquí se pinta siempre en la zona del
 * evento, y se avisa de cuál es cuando no coincide con la de quien lee.
 *
 * No hace falta ninguna biblioteca: Intl ya sabe de zonas y de horarios de
 * verano. Lo único que hay que construir a mano es el camino inverso, de hora
 * de pared a instante, que es lo que necesitan los formularios.
 */

/** Minutos que la zona lleva por delante de UTC en ese instante. */
function desfase(ms: number, zona: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: zona, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p: Record<string, string> = {};
  for (const parte of dtf.formatToParts(new Date(ms))) p[parte.type] = parte.value;
  const comoSiFueraUtc = Date.UTC(
    Number(p.year), Number(p.month) - 1, Number(p.day),
    Number(p.hour) % 24, Number(p.minute), Number(p.second),
  );
  return (comoSiFueraUtc - ms) / 60000;
}

/** 'AAAA-MM-DDTHH:mm' leído como hora de pared de esa zona → instante ISO. */
export function instanteDesdeHoraLocal(pared: string, zona?: string | null): string {
  if (!zona) return new Date(pared).toISOString();
  const [fecha, hora] = pared.split('T');
  const [a, m, d] = fecha.split('-').map(Number);
  const [hh, mm] = (hora || '00:00').split(':').map(Number);
  const base = Date.UTC(a, m - 1, d, hh, mm);
  // Dos pasadas: la primera estima el desfase, la segunda lo corrige en los
  // días en que cambia el horario de verano.
  let ms = base;
  for (let i = 0; i < 2; i++) ms = base - desfase(ms, zona) * 60000;
  return new Date(ms).toISOString();
}

/** Instante ISO → 'AAAA-MM-DDTHH:mm' en hora de pared de esa zona. */
export function horaLocalDesdeInstante(iso: string, zona?: string | null): string {
  const d = new Date(iso);
  if (!zona) {
    const p = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
    return p.slice(0, 16);
  }
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: zona, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
  const p: Record<string, string> = {};
  for (const parte of dtf.formatToParts(d)) p[parte.type] = parte.value;
  const hh = String(Number(p.hour) % 24).padStart(2, '0');
  return `${p.year}-${p.month}-${p.day}T${hh}:${p.minute}`;
}

/** Zona del navegador de quien está leyendo. */
export function zonaDelLector(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
  catch { return 'UTC'; }
}

/** «Europe/Madrid» → «Madrid». Para decir en qué hora está escrito. */
export function ciudadDeZona(zona: string): string {
  const cola = zona.split('/').pop() || zona;
  return cola.replace(/_/g, ' ');
}

/**
 * Fecha de un evento, en la hora de su propia ciudad.
 * Sin hora confirmada se muestra sólo el día: más vale eso que una hora inventada.
 */
export function fechaDeEvento(
  iso: string,
  opciones: { zona?: string | null; conHora?: boolean; idioma: string },
): string {
  const { zona, idioma } = opciones;
  const conHora = opciones.conHora !== false;
  const fmt: Intl.DateTimeFormatOptions = conHora
    ? { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
    : { weekday: 'short', day: 'numeric', month: 'short' };
  if (zona) fmt.timeZone = zona;
  return new Intl.DateTimeFormat(idioma, fmt).format(new Date(iso));
}

/**
 * Cómo nombrar la hora en la tarjeta, o null si el evento ya está en la zona
 * de quien lee y no hace falta aclarar nada. Se prefiere la etiqueta que venga
 * del propio evento (su país), porque «hora de Brasil» se entiende mejor que
 * «hora de Sao Paulo» para un congreso de Fortaleza.
 */
export function zonaQueConvieneDecir(
  zona?: string | null,
  conHora = true,
  etiqueta?: string | null,
): string | null {
  if (!zona || !conHora) return null;
  if (zona === zonaDelLector()) return null;
  return (etiqueta && etiqueta.trim()) || ciudadDeZona(zona);
}
