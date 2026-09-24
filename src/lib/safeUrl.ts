/**
 * safeUrl — sanea URLs provenientes de datos (prestadores, autores, empresas)
 * antes de usarlas como `href` o en `window.open`.
 *
 * Motivo (seguridad): `new URL('javascript:alert(1)')` es "válida" y React no
 * bloquea hrefs `javascript:`; un valor guardado por una cuenta semi-confiable
 * podría ejecutar script en el origen (XSS almacenado) al hacer clic. Aquí solo
 * se permiten esquemas http/https; lo demás (javascript:, data:, vbscript:…) se
 * descarta. Si el valor no trae esquema, se asume https.
 */
export function safeHttpUrl(u?: string | null): string | undefined {
  if (!u) return undefined;
  const s = String(u).trim();
  if (!s) return undefined;
  // Si no declara esquema (p. ej. "ejemplo.com/x"), asumimos https.
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`;
  try {
    const proto = new URL(withScheme).protocol;
    return proto === 'http:' || proto === 'https:' ? withScheme : undefined;
  } catch {
    return undefined;
  }
}

/** true si la cadena es una URL http/https segura. Útil para validación Zod. */
export function isSafeHttpUrl(u?: string | null): boolean {
  return safeHttpUrl(u) !== undefined;
}
