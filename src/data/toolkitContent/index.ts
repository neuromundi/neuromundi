import type { ToolkitModule, ToolkitSectionKey } from './types';
// Neurodivergencias (kit original) — 11 idiomas completos.
import { MODULES as nx_es } from './content.es';
import { MODULES as nx_en } from './content.en';
import { MODULES as nx_fr } from './content.fr';
import { MODULES as nx_de } from './content.de';
import { MODULES as nx_it } from './content.it';
import { MODULES as nx_pt } from './content.pt';
import { MODULES as nx_ja } from './content.ja';
import { MODULES as nx_zh } from './content.zh';
import { MODULES as nx_ar } from './content.ar';
import { MODULES as nx_he } from './content.he';
import { MODULES as nx_ko } from './content.ko';
// Neurodesarrollo — es/en; el resto de idiomas cae a inglés/español hasta traducir.
import { MODULES as nd_es } from './nd.es';
import { MODULES as nd_en } from './nd.en';
import { MODULES as nd_pt } from './nd.pt';
import { MODULES as nd_fr } from './nd.fr';
import { MODULES as nd_it } from './nd.it';
import { MODULES as nd_de } from './nd.de';
import { MODULES as nd_ja } from './nd.ja';
import { MODULES as nd_zh } from './nd.zh';
import { MODULES as nd_ko } from './nd.ko';
import { MODULES as nd_ar } from './nd.ar';
import { MODULES as nd_he } from './nd.he';
// Afecciones neurológicas — es/en.
import { MODULES as af_es } from './af.es';
import { MODULES as af_en } from './af.en';
import { MODULES as af_pt } from './af.pt';
import { MODULES as af_fr } from './af.fr';
import { MODULES as af_it } from './af.it';
import { MODULES as af_de } from './af.de';
import { MODULES as af_ja } from './af.ja';
import { MODULES as af_zh } from './af.zh';
import { MODULES as af_ko } from './af.ko';
import { MODULES as af_ar } from './af.ar';
import { MODULES as af_he } from './af.he';

export * from './types';

const NEURODIVERGENCIAS: Record<string, ToolkitModule[]> = {
  es: nx_es, en: nx_en, fr: nx_fr, de: nx_de, it: nx_it, pt: nx_pt,
  ja: nx_ja, zh: nx_zh, ar: nx_ar, he: nx_he, ko: nx_ko,
};
const NEURODESARROLLO: Record<string, ToolkitModule[]> = { es: nd_es, en: nd_en, pt: nd_pt, fr: nd_fr, it: nd_it, de: nd_de, ja: nd_ja, zh: nd_zh, ko: nd_ko, ar: nd_ar, he: nd_he };
const AFECCIONES: Record<string, ToolkitModule[]> = { es: af_es, en: af_en, pt: af_pt, fr: af_fr, it: af_it, de: af_de, ja: af_ja, zh: af_zh, ko: af_ko, ar: af_ar, he: af_he };

const BY_SECTION: Record<ToolkitSectionKey, Record<string, ToolkitModule[]>> = {
  neurodivergencias: NEURODIVERGENCIAS,
  neurodesarrollo: NEURODESARROLLO,
  afecciones: AFECCIONES,
};

/** Módulos del kit para un idioma y una sección (por defecto, neurodivergencias).
 *  Cae al inglés y luego al español si falta el idioma para esa sección. */
export function getModules(lang: string, section: ToolkitSectionKey = 'neurodivergencias'): ToolkitModule[] {
  const base = (lang || 'es').split('-')[0];
  const bySec = BY_SECTION[section] ?? NEURODIVERGENCIAS;
  return bySec[base] ?? bySec.en ?? bySec.es;
}

export function getModule(lang: string, section: ToolkitSectionKey, id: string): ToolkitModule | undefined {
  return getModules(lang, section).find((m) => m.id === id);
}
