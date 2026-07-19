/**
 * NavPill — botón de navegación con fondo de color propio y un efecto "elevar y
 * brillar" al pasar el cursor (escritorio) o al tocar (móvil): se eleva un poco,
 * gana una sombra de color y aumenta el brillo; al presionar, se hunde.
 * El movimiento se neutraliza automáticamente con "reducir movimiento".
 */
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

export function NavPill({
  to,
  icon,
  label,
  colorClass,
}: {
  to: string;
  icon?: ReactNode;
  label: string;
  /** Clases de fondo (sólido o gradiente) propias de la sección. */
  colorClass: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'group flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-white',
          'transition-all duration-200 will-change-transform',
          'hover:-translate-y-0.5 hover:shadow-lg hover:brightness-110',
          'active:translate-y-0 active:brightness-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          colorClass,
          isActive ? 'ring-2 ring-white/70 ring-offset-1' : '',
        ].join(' ')
      }
    >
      {icon && <span className="transition-transform duration-200 group-hover:scale-110">{icon}</span>}
      {label}
    </NavLink>
  );
}
