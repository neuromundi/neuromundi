import type { ToolkitModule } from './types';
import { MODULES as es } from './content.es';
import { MODULES as en } from './content.en';
import { MODULES as fr } from './content.fr';
import { MODULES as de } from './content.de';
import { MODULES as it } from './content.it';
import { MODULES as pt } from './content.pt';
import { MODULES as ja } from './content.ja';
import { MODULES as zh } from './content.zh';
import { MODULES as ar } from './content.ar';
import { MODULES as he } from './content.he';
import { MODULES as ko } from './content.ko';

export * from './types';

const BY_LANG: Record<string, ToolkitModule[]> = { es, en, fr, de, it, pt, ja, zh, ar, he, ko };

export function getModules(lang: string): ToolkitModule[] {
  const base = (lang || 'es').split('-')[0];
  return BY_LANG[base] ?? BY_LANG.en ?? BY_LANG.es;
}

export function getModule(lang: string, id: string): ToolkitModule | undefined {
  return getModules(lang).find((m) => m.id === id);
}
