/**
 * ContentRenderer — dibuja los bloques de contenido de un módulo del Kit.
 *
 * Prioriza la legibilidad cognitiva: mucho espacio en blanco, texto amplio,
 * alto contraste y jerarquía clara. Sin animaciones que sobreestimulen.
 */
import { Check, Info, Heart, Lightbulb } from 'lucide-react';
import type { ContentBlock } from '@/data/toolkit';
import type { Accent } from './meta';
import { DownloadResourceButton } from './DownloadResourceButton';

const CALLOUT_STYLES = {
  calm: { box: 'bg-brand-50 border-brand-200', icon: 'text-brand-700', Icon: Info },
  care: { box: 'bg-sage-50 border-sage-500/30', icon: 'text-sage-700', Icon: Heart },
  tip: { box: 'bg-warm-50 border-warm-300', icon: 'text-warm-700', Icon: Lightbulb },
} as const;

function Block({ block, accent }: { block: ContentBlock; accent: Accent }) {
  switch (block.kind) {
    case 'lead':
      return <p className="text-lg leading-relaxed text-slate-700">{block.text}</p>;

    case 'p':
      return <p className="leading-relaxed text-slate-700">{block.text}</p>;

    case 'list':
      return (
        <ul className="space-y-2.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 leading-relaxed text-slate-700">
              {block.variant === 'check' ? (
                <Check className={`mt-1 h-4 w-4 shrink-0 ${accent.text}`} aria-hidden="true" />
              ) : (
                <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${accent.dot}`} aria-hidden="true" />
              )}
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );

    case 'steps':
      return (
        <ol className="space-y-3">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 leading-relaxed text-slate-700">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${accent.soft} ${accent.text} text-sm font-bold`}>
                {i + 1}
              </span>
              <span className="pt-0.5">{item}</span>
            </li>
          ))}
        </ol>
      );

    case 'callout': {
      const s = CALLOUT_STYLES[block.tone];
      return (
        <div className={`flex gap-3 rounded-2xl border p-4 ${s.box}`} role="note">
          <s.Icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.icon}`} aria-hidden="true" />
          <div>
            {block.title && <p className="font-semibold text-slate-900">{block.title}</p>}
            <p className="leading-relaxed text-slate-700">{block.text}</p>
          </div>
        </div>
      );
    }

    case 'glossary':
      return (
        <dl className="grid gap-3 sm:grid-cols-2">
          {block.items.map((it, i) => (
            <div key={i} className="rounded-2xl border border-slate-100 bg-white p-4">
              <dt className={`font-semibold ${accent.text}`}>{it.term}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-slate-700">{it.plain}</dd>
            </div>
          ))}
        </dl>
      );

    case 'table':
      return (
        <figure className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className={`border-b-2 ${accent.border}`}>
                {block.columns.map((c, i) => (
                  <th key={i} scope="col" className="px-3 py-2 font-semibold text-slate-900">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-slate-100 align-top">
                  {row.map((cell, ci) => (
                    <td key={ci} className={`px-3 py-2.5 leading-relaxed text-slate-700 ${ci === 0 ? 'font-medium text-slate-900' : ''}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {block.caption && <figcaption className="mt-2 text-xs text-muted">{block.caption}</figcaption>}
        </figure>
      );

    case 'resource':
      return <DownloadResourceButton file={block.file} label={block.label} description={block.description} />;

    default:
      return null;
  }
}

export function ContentRenderer({ blocks, accent }: { blocks: ContentBlock[]; accent: Accent }) {
  return (
    <div className="space-y-5">
      {blocks.map((block, i) => (
        <Block key={i} block={block} accent={accent} />
      ))}
    </div>
  );
}
