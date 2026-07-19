/**
 * NavMoreMenu — desplegable "Más" para el header de escritorio. Agrupa enlaces
 * secundarios para descongestionar la barra principal. Se cierra al hacer clic
 * fuera o con Escape, y al elegir un destino. Accesible con teclado.
 */
import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

export type MoreItem = { to: string; label: string; icon?: ReactNode };

export function NavMoreMenu({ label, items }: { label: string; items: MoreItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-slate-600 px-2.5 py-1.5 text-[13px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        {label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 min-w-[13rem] overflow-hidden rounded-xl border border-slate-100 bg-white p-1 shadow-xl">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                [
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
                  isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-700 hover:bg-slate-50',
                ].join(' ')
              }
            >
              {it.icon && <span className="text-slate-400">{it.icon}</span>}
              {it.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
