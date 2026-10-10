import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

const STEPS = [
  { id: 'search', label: 'Search' },
  { id: 'seat', label: 'Seat' },
  { id: 'details', label: 'Details' },
  { id: 'payment', label: 'Payment' },
  { id: 'confirmed', label: 'Confirmed' },
];

export default function BookingStepper({ current = 'search', className }) {
  const currentIndex = Math.max(
    0,
    STEPS.findIndex((s) => s.id === current)
  );

  return (
    <nav aria-label="Booking progress" className={cn('w-full', className)}>
      <ol className="flex items-center gap-1 overflow-x-auto pb-1 sm:gap-2">
        {STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition',
                  done && 'bg-brand text-white',
                  active && 'bg-brand-gradient text-white shadow-[var(--shadow-lift)]',
                  !done && !active && 'border border-line bg-white text-slate'
                )}
                aria-current={active ? 'step' : undefined}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : index + 1}
              </div>
              <span
                className={cn(
                  'hidden truncate text-xs font-medium sm:inline',
                  active ? 'text-navy' : 'text-slate'
                )}
              >
                {step.label}
              </span>
              {index < STEPS.length - 1 ? (
                <span
                  className={cn(
                    'mx-1 hidden h-px flex-1 sm:block',
                    index < currentIndex ? 'bg-brand' : 'bg-line'
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
