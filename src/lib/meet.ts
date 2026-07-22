/**
 * meet — salas de videollamada para consultas en línea.
 *
 * Usa Jitsi Meet (meet.jit.si): salas privadas con nombre imposible de adivinar,
 * sin costo ni claves externas, y con opción de cifrado E2EE y sala de espera que
 * los participantes activan dentro de la reunión. La URL se genera y se comparte
 * con el paciente (se guarda en la cita como `online_url`).
 */

/** Genera la URL de una sala de video única para Neuromundi. */
export function jitsiRoomUrl(seed?: string): string {
  const base = (seed ?? '').trim().replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);
  const rand = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const slug = base ? `${base}-${rand}` : rand;
  return `https://meet.jit.si/Neuromundi-${slug}`;
}

/** ¿La URL es una sala de video reconocida? */
export function isMeetUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'meet.jit.si' || host.endsWith('.meet.jit.si');
  } catch {
    return false;
  }
}
