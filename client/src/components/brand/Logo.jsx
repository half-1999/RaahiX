import { cn } from '../../utils/cn';

export default function Logo({ className, markOnly = false, inverted = false }) {
  const word = inverted ? 'text-white' : 'text-navy';
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <img
        src="/raahix-mark.jpg"
        alt=""
        width="36"
        height="36"
        className="h-9 w-9 shrink-0 rounded-xl object-cover"
      />
      {markOnly ? (
        <span className="sr-only">RaahiX</span>
      ) : (
        <span className="leading-tight">
          <span className={cn('block font-display text-xl font-bold tracking-tight', word)}>RaahiX</span>
          <span className={cn('block text-[10px] font-semibold uppercase tracking-[0.14em]', inverted ? 'text-white/70' : 'text-slate')}>
            Shared rides
          </span>
        </span>
      )}
    </span>
  );
}
