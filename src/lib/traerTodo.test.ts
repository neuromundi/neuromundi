/**
 * El 19 de octubre de 2026 el directorio mostro 1,000 de 1,818 fichas porque el
 * servidor corta en mil filas sin avisar. Estas pruebas fijan que `traerTodo`
 * pida paginas hasta agotarlas y que no se quede dando vueltas.
 */
import { describe, it, expect } from 'vitest';
import { traerTodo, FILAS_POR_PAGINA } from './traerTodo';

/** Servidor de mentira que corta en FILAS_POR_PAGINA, igual que el de verdad. */
function servidorCon(total: number) {
  const llamadas: Array<[number, number]> = [];
  const consulta = (desde: number, hasta: number) => {
    llamadas.push([desde, hasta]);
    const filas = [];
    for (let i = desde; i <= Math.min(hasta, total - 1); i += 1) filas.push({ id: i });
    return Promise.resolve({ data: filas, error: null });
  };
  return { consulta, llamadas };
}

describe('traerTodo', () => {
  it('trae las 1,818 filas, no las primeras mil', async () => {
    const { consulta, llamadas } = servidorCon(1818);
    const filas = await traerTodo<{ id: number }>(consulta);
    expect(filas).toHaveLength(1818);
    expect(llamadas).toHaveLength(2);
    expect(filas[0].id).toBe(0);
    expect(filas[1817].id).toBe(1817);
  });

  it('con menos de una pagina pide UNA sola vez', async () => {
    const { consulta, llamadas } = servidorCon(223);
    const filas = await traerTodo(consulta);
    expect(filas).toHaveLength(223);
    expect(llamadas).toHaveLength(1);
  });

  it('con exactamente una pagina pide otra para comprobar que no hay mas', async () => {
    const { consulta, llamadas } = servidorCon(FILAS_POR_PAGINA);
    const filas = await traerTodo(consulta);
    expect(filas).toHaveLength(FILAS_POR_PAGINA);
    expect(llamadas).toHaveLength(2);
  });

  it('sin filas no devuelve nada y no revienta', async () => {
    const { consulta } = servidorCon(0);
    expect(await traerTodo(consulta)).toEqual([]);
  });

  it('no se queda en bucle si el servidor siempre devuelve pagina llena', async () => {
    let veces = 0;
    const filas = await traerTodo(() => {
      veces += 1;
      return Promise.resolve({
        data: Array.from({ length: FILAS_POR_PAGINA }, (_, i) => ({ id: i })),
        error: null,
      });
    });
    expect(veces).toBe(20);
    expect(filas).toHaveLength(20 * FILAS_POR_PAGINA);
  });

  it('un error del servidor se lanza y NO se devuelve una lista a medias', async () => {
    const consulta = (desde: number) =>
      Promise.resolve(
        desde === 0
          ? { data: Array.from({ length: FILAS_POR_PAGINA }, (_, i) => ({ id: i })), error: null }
          : { data: null, error: { message: 'se cayo la red' } },
      );
    await expect(traerTodo(consulta)).rejects.toMatchObject({ message: 'se cayo la red' });
  });
});
