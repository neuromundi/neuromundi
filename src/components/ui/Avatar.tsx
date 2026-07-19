/**
 * Avatar — muestra la foto si existe; si no, las iniciales sobre un color
 * estable derivado del nombre. Evita los círculos grises sin identidad.
 */
const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-lg',
} as const;

// Paleta suave; el color se elige de forma determinista según el nombre.
const PALETTE = [
  'bg-brand-100 text-brand-800',
  'bg-warm-100 text-warm-700',
  'bg-sage-50 text-sage-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-cyan-100 text-cyan-700',
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const label = (name ?? '').trim();
  const cls = `${SIZES[size]} shrink-0 rounded-full object-cover ${className ?? ''}`;

  if (src) {
    return <img src={src} alt="" loading="lazy" decoding="async" className={cls} />;
  }
  return (
    <span
      aria-hidden="true"
      className={`${SIZES[size]} ${colorFor(label || '?')} flex shrink-0 items-center justify-center rounded-full font-semibold ${className ?? ''}`}
    >
      {initials(label || '?')}
    </span>
  );
}
