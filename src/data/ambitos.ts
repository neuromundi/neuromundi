/**
 * Ámbito de un evento en línea: a qué países le interesa de verdad.
 *
 * Un evento en línea no tiene país, así que antes salía en la búsqueda de
 * todos. Un congreso virtual en español apareciendo en Portugal no le sirve a
 * nadie, y ensucia la lista de quien busca cerca de sí.
 *
 * El criterio que de verdad separa estos casos es el IDIOMA, no la frontera:
 * por eso los dos ámbitos acotados son el hispanohablante y el lusohablante.
 * Se guardan como lista de países para que la búsqueda por país siga siendo
 * una sola comparación, y para que mañana se pueda afinar un caso suelto sin
 * tocar código.
 */
import { COUNTRIES } from './countries';

const porCodigo = (codigos: string[]): string[] =>
  COUNTRIES.filter((c) => codigos.includes(c.code)).map((c) => c.name);

/** Países donde el español es lengua oficial o de uso mayoritario. */
export const PAISES_HISPANOHABLANTES = porCodigo([
  'AR', 'BO', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'ES', 'GQ', 'GT',
  'HN', 'MX', 'NI', 'PA', 'PE', 'PR', 'PY', 'SV', 'UY', 'VE',
  // Estados Unidos entra por su comunidad hispanohablante, que es la segunda
  // del mundo por número de personas.
  'US',
]);

/** Países donde el portugués es lengua oficial. */
export const PAISES_LUSOHABLANTES = porCodigo([
  'AO', 'BR', 'CV', 'GW', 'GQ', 'MZ', 'PT', 'ST', 'TL',
]);

export type ValorAmbito = 'todos' | 'es' | 'pt' | 'medida';

export interface Ambito {
  value: Exclude<ValorAmbito, 'medida'>;
  claveTexto: string;
  paises: string[];
}

export const AMBITOS: Ambito[] = [
  { value: 'todos', claveTexto: 'events.scopeAll', paises: [] },
  { value: 'es', claveTexto: 'events.scopeEs', paises: PAISES_HISPANOHABLANTES },
  { value: 'pt', claveTexto: 'events.scopePt', paises: PAISES_LUSOHABLANTES },
];

/** De la lista guardada al ámbito que le corresponde en el formulario. */
export function ambitoDeLista(paises?: string[] | null): ValorAmbito {
  if (!paises || paises.length === 0) return 'todos';
  const mismo = (a: string[], b: string[]) =>
    a.length === b.length && a.every((x) => b.includes(x));
  if (mismo(paises, PAISES_HISPANOHABLANTES)) return 'es';
  if (mismo(paises, PAISES_LUSOHABLANTES)) return 'pt';
  // Una lista puesta a mano no entra en ninguno de los tres cajones. Se
  // devuelve «a medida» para que el formulario la conserve tal cual en vez de
  // machacarla al guardar.
  return 'medida';
}

/** Lista que hay que guardar para un ámbito; «a medida» conserva la anterior. */
export function listaDeAmbito(v: ValorAmbito, anterior?: string[] | null): string[] {
  if (v === 'medida') return anterior ?? [];
  return AMBITOS.find((a) => a.value === v)?.paises ?? [];
}
