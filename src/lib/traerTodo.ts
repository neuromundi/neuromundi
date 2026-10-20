/**
 * traerTodo — trae TODAS las filas de una consulta, no las primeras mil.
 *
 * El servidor devuelve como maximo 1,000 filas por peticion y lo hace EN
 * SILENCIO: no es un error, simplemente llegan mil. El 19 de octubre de 2026
 * eso dejo 818 de las 1,818 fichas publicadas invisibles en el directorio
 * durante semanas, sin un solo mensaje. Este ayudante existe para que ese
 * recorte no pueda repetirse en ninguna pantalla: se pide por paginas hasta
 * que una viene incompleta, que es la unica senal de que ya no hay mas.
 *
 * Uso: se le pasa una funcion que construye la consulta para un rango.
 *
 *   const filas = await traerTodo((desde, hasta) =>
 *     supabase.from('tabla').select('a,b').eq('x', y).order('id').range(desde, hasta));
 *
 * El `order` es obligatorio para que las paginas no se solapen ni se salten
 * filas: sin un orden estable, el servidor no garantiza que la pagina 2
 * continue donde acabo la 1.
 */
export const FILAS_POR_PAGINA = 1000;

/** Tope de seguridad: 20 paginas son 20,000 filas. Si alguna consulta llega
 *  ahi, el problema es la consulta, no el paginado, y mas vale cortar que
 *  dejar al navegador de la persona dando vueltas. */
const PAGINAS_MAXIMAS = 20;

export async function traerTodo<T>(
  consulta: (desde: number, hasta: number) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
): Promise<T[]> {
  const todas: T[] = [];
  for (let pagina = 0; pagina < PAGINAS_MAXIMAS; pagina += 1) {
    const desde = pagina * FILAS_POR_PAGINA;
    const { data, error } = await consulta(desde, desde + FILAS_POR_PAGINA - 1);
    if (error) throw error;
    const filas = data ?? [];
    todas.push(...filas);
    if (filas.length < FILAS_POR_PAGINA) break;
  }
  return todas;
}
