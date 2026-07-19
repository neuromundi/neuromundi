/**
 * Tipos del Kit de Herramientas (compartidos por todos los idiomas).
 */
export type ContentBlock =
  | { kind: 'lead'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[]; variant?: 'bullet' | 'check' }
  | { kind: 'steps'; items: string[] }
  | { kind: 'callout'; tone: 'calm' | 'care' | 'tip'; title?: string; text: string }
  | { kind: 'glossary'; items: { term: string; plain: string }[] }
  | { kind: 'table'; columns: string[]; rows: string[][]; caption?: string }
  | { kind: 'resource'; file: string; label: string; description?: string };

export interface ToolkitSection {
  id: string;
  title: string;
  blocks: ContentBlock[];
}

export type ModuleId = 'A' | 'B' | 'C' | 'D' | 'E';

export interface ToolkitModule {
  id: ModuleId;
  slug: string;
  icon: 'stethoscope' | 'graduation' | 'waves' | 'hearthands' | 'scale';
  title: string;
  area: string;
  summary: string;
  sections: ToolkitSection[];
}
