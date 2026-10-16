/**
 * Versión vigente del reglamento + descargo de responsabilidad.
 * Al cambiar el texto legal, incrementa esta versión para poder exigir
 * re-aceptación y dejar trazabilidad en public.user_agreements.
 */
// OJO: la fuente de verdad es la base, no este archivo. public.reglamento_vigente()
// la devuelve y public.aceptar_reglamento() la escribe sin recibirla del cliente
// (migracion 0241, hallazgo M-18). Esta constante solo la usa el ALTA inicial.
export const RULES_VERSION = '2026-07';
