import { cn } from '../../utils/cn';

/** Shared grid for dashboard stats — 2 columns on mobile, wider on larger screens. */
export function SummaryGrid({ children, className }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 xl:grid-cols-4', className)}>
      {children}
    </div>
  );
}

export default function SummaryCard({ label, value, icon: Icon, hint, className }) {
  return (
    <div
      className={cn(
        'rounded-2xl border-2 border-ink/10 bg-white p-3 shadow-[var(--shadow-soft)] sm:p-4',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate sm:text-[11px]">
            {label}
          </p>
          <p className="mt-1 font-display text-[clamp(1.15rem,2vw+0.4rem,1.85rem)] font-bold leading-none text-ink">
            {value}
          </p>
          {hint ? <p className="mt-1.5 text-[11px] text-slate sm:text-xs">{hint}</p> : null}
        </div>
        {Icon ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand text-ink sm:h-10 sm:w-10">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
          </span>
        ) : null}
      </div>
    </div>
  );
}
