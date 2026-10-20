/**
 * idiomaDePago — el idioma con el que la persona está usando Neuromundi, para
 * que el portal de pago de Stripe salga en ese idioma y no en el que Stripe
 * decida.
 *
 * Por qué existe (20 de octubre de 2026, arranque): a un usuario de México el
 * portal de pago le apareció entero en inglés. Pagar es el momento con menos
 * tolerancia a la confusión de toda la plataforma: si alguien no entiende lo
 * que está firmando, no paga, y con razón.
 *
 * Se manda desde el cliente porque el servidor no tiene forma fiable de saber
 * en qué idioma está la pantalla: la cabecera del navegador puede decir otra
 * cosa que el idioma que la persona eligió en Neuromundi.
 */
import i18n from '@/i18n';

export function idiomaDePago(): string {
  return i18n.language || 'es';
}
