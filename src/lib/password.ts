/**
 * Requisito de contraseña — ESPEJO del que aplica Supabase Auth (GoTrue) cuando
 * se activa "required characters" en el panel: mínimo 8 y al menos una
 * minúscula, una mayúscula, un dígito y un símbolo. Validamos en el CLIENTE para
 * que el usuario vea el mensaje en SU idioma (i18n) antes de llamar al servidor,
 * en vez del mensaje fijo en inglés que devuelve GoTrue.
 * El set de símbolos coincide con el permitido por Supabase.
 */
const LOWER = /[a-z]/;
const UPPER = /[A-Z]/;
const DIGIT = /[0-9]/;
const SYMBOL = /[!@#$%^&*()_+\-=[\]{};'\\:"|<>?,./`~]/;

export function isStrongPassword(pw: string): boolean {
  return (
    pw.length >= 8 &&
    LOWER.test(pw) &&
    UPPER.test(pw) &&
    DIGIT.test(pw) &&
    SYMBOL.test(pw)
  );
}
