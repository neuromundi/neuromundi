/**
 * Skeleton — placeholders de carga (nunca un spinner solitario).
 *
 * El shimmer solo se anima si el usuario no pidió reducir movimiento. SkeletonCard
 * reproduce la silueta de ProviderCard para que la transición a contenido real no
 * provoque saltos de layout.
 */
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-md bg-slate-200 motion-safe:animate-pulse',
        className,
      )}
    />
  );
}

export interface SkeletonCardProps {
  /** Número de barras de dimensión a simular. */
  rows?: number;
  className?: string;
}

export function SkeletonCard({ rows = 3, className }: SkeletonCardProps) {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-label={t('common.loadingItem')}
      className={cn(
        'rounded-2xl border border-slate-100 bg-white p-5 shadow-sm',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>

      <Skeleton className="my-4 h-px w-full" />

      <Skeleton className="h-6 w-24 rounded-full" />

      <div className="mt-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-2.5 w-full rounded-full" />
          </div>
        ))}
      </div>

      <div className="mt-5 flex gap-3">
        <Skeleton className="h-11 flex-1 rounded-xl" />
        <Skeleton className="h-11 w-24 rounded-xl" />
      </div>
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  );
}
