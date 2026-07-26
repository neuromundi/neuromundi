/**
 * SearchableSelect — selector con búsqueda (typeahead) para listas largas.
 * Accesible por teclado básico; cierra al hacer clic fuera; insensible a acentos.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

export interface Option {
  value: string;
  label: string;
  group?: string;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  noMatches,
  ariaLabel,
  className,
}: {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  noMatches: string;
  ariaLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = useMemo(() => {
    const nq = norm(q.trim());
    return nq ? options.filter((o) => norm(o.label).includes(nq)) : options;
  }, [q, options]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setQ('');
  };

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <div className="relative">
        <input
          type="text"
          aria-label={ariaLabel}
          value={open ? q : selected?.label ?? ''}
          placeholder={open ? searchPlaceholder : selected ? selected.label : placeholder}
          onFocus={() => { setQ(''); setOpen(true); }}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          className="w-full rounded-xl border border-slate-200 p-2.5 pr-14 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        />
        {value ? (
          <button
            type="button"
            onClick={() => pick('')}
            aria-label={placeholder}
            className="absolute right-8 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      </div>

      {open && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full min-w-[16rem] overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          <li>
            <button type="button" onClick={() => pick('')} className="flex w-full px-3 py-2 text-left text-sm text-muted hover:bg-slate-50">
              {placeholder}
            </button>
          </li>
          {filtered.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                onClick={() => pick(o.value)}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${o.value === value ? 'bg-brand-50 font-semibold text-brand-800' : 'text-slate-800'}`}
              >
                <span>{o.label}</span>
                {o.group && <span className="shrink-0 text-xs text-muted">{o.group}</span>}
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted">{noMatches}</li>
          )}
        </ul>
      )}
      {/* Placeholder de búsqueda visible solo como pista cuando está abierto y vacío */}
      {open && q === '' && !selected && (
        <span className="sr-only">{searchPlaceholder}</span>
      )}
    </div>
  );
}
