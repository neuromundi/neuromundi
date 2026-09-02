/**
 * useSeo — setea <title>, meta description, canonical y Open Graph/Twitter
 * para una ruta pública concreta.
 *
 * El index.html trae valores por defecto (los de la portada, "/"); este hook
 * los sobrescribe en rutas que necesitan su propio SEO y restaura el título
 * anterior al desmontar, para no "ensuciar" otras páginas de la SPA.
 *
 * No requiere react-helmet: son pocos tags y basta con manipular el DOM. Si
 * la ruta también se agrega a `scripts/prerender.mjs` (include), react-snap
 * capturará estos tags ya resueltos en el HTML estático — así los rastreadores
 * que no ejecutan JS (bots de redes sociales al generar la vista previa de un
 * link) también los ven, no solo Google.
 */
import { useEffect } from 'react';

export interface SeoOptions {
  /** Título de pestaña / <title>. Inclúyele ya el sufijo "— Neuromundi" si aplica. */
  title: string;
  /** Meta description y og:description / twitter:description. */
  description: string;
  /** Ruta absoluta desde la raíz, p. ej. '/fundadores'. Se usa para canonical y og:url. */
  path: string;
  /** URL absoluta de imagen para OG/Twitter. Por defecto, el héroe del sitio. */
  image?: string;
}

const SITE_URL = 'https://www.neuromundi.com';
const DEFAULT_IMAGE = `${SITE_URL}/hero-neuromundi.jpg`;

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function useSeo({ title, description, path, image = DEFAULT_IMAGE }: SeoOptions) {
  useEffect(() => {
    const prevTitle = document.title;
    const url = `${SITE_URL}${path}`;

    document.title = title;
    upsertMeta('name', 'description', description);
    upsertLink('canonical', url);

    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', image);

    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);

    return () => {
      // Restaura el título de la portada; el resto de los tags se
      // sobrescriben en la siguiente ruta que llame a useSeo (o vuelven a
      // sus valores de index.html al recargar), así que no hace falta
      // revertirlos aquí uno por uno.
      document.title = prevTitle;
    };
  }, [title, description, path, image]);
}
