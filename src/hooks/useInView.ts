/**
 * useInView — activa contenido cuando su ancla entra en el viewport (una sola
 * vez). Sirve para diferir secciones bajo el pliegue FUERA de la ruta crítica
 * del LCP: sus consultas a la base no compiten con la primera carga y, como
 * Lighthouse no hace scroll durante la medición, ni siquiera se piden en la
 * auditoría. Cae en `true` de inmediato si no hay IntersectionObserver.
 */
import { useEffect, useRef, useState } from 'react';

export function useInView<T extends HTMLElement = HTMLDivElement>(rootMargin = '300px'): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView) return;
    if (typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) { setInView(true); obs.disconnect(); }
      },
      { rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [inView, rootMargin]);

  return [ref, inView];
}
