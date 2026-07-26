/**
 * useIdleReady — false en el primer pintado, true cuando el navegador queda
 * ocioso (o, como respaldo, tras `fallbackMs`).
 *
 * Sirve para APLAZAR el montaje de UI que está debajo del pliegue: mientras
 * devuelve false, quien lo use no monta el componente, así sus consultas a la
 * base y sus chunks NO viajan en la ventana crítica del LCP. Es el mismo patrón
 * que `deferUi` en AppLayout, extraído para reutilizarlo.
 */
import { useEffect, useState } from 'react';

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

export function useIdleReady(fallbackMs = 2000): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const w = window as IdleWindow;
    const run = () => setReady(true);
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(run, { timeout: fallbackMs + 1000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(run, fallbackMs);
    return () => window.clearTimeout(id);
  }, [fallbackMs]);

  return ready;
}
