import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import Button from '../ui/Button';

/**
 * Desktop: inline filter row.
 * Mobile: right-aligned "Search Filters" control that opens a full-width sheet.
 */
export default function SearchFiltersBar({
  children,
  activeCount = 0,
  onReset,
  className,
  label = 'Search Filters',
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop / tablet filters */}
      <div
        className={cn(
          'hidden flex-wrap items-end gap-2 md:flex',
          className
        )}
      >
        {children}
        {onReset && activeCount > 0 ? (
          <button
            type="button"
            className="h-11 text-sm font-semibold text-brand-ink underline-offset-2 hover:underline"
            onClick={onReset}
          >
            Reset filters
          </button>
        ) : null}
      </div>

      {/* Mobile: trigger pinned to the right */}
      <div className="flex justify-end md:hidden">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="relative"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          {label}
          {activeCount > 0 ? (
            <span className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-ink">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl border border-line bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[var(--shadow-lift)]"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-ink" aria-hidden="true" />
                <h2 className="font-display text-lg font-bold text-ink">{label}</h2>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line text-ink"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3">{children}</div>

            <div className="mt-4 flex gap-2">
              {onReset ? (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    onReset();
                  }}
                >
                  Reset
                </Button>
              ) : null}
              <Button type="button" className="flex-1" onClick={() => setOpen(false)}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
