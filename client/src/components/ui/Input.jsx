import { cn } from '../../utils/cn';

export default function Input({
  label,
  error,
  hint,
  className,
  inputClassName,
  id,
  icon: Icon,
  dense = false,
  ...props
}) {
  const inputId = id || props.name;
  return (
    <label className={cn('block', dense ? 'space-y-1' : 'space-y-1.5', className)}>
      {label ? (
        <span className={cn('font-medium text-ink', dense ? 'text-xs' : 'text-sm')}>{label}</span>
      ) : null}
      <span className="relative block">
        {Icon ? (
          <Icon
            className={cn(
              'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink',
              dense ? 'h-3.5 w-3.5' : 'h-4 w-4'
            )}
            aria-hidden="true"
          />
        ) : null}
        <input
          id={inputId}
          className={cn(
            'w-full rounded-xl border border-line bg-white text-sm text-ink placeholder:text-slate outline-none transition focus:border-brand-dark focus:ring-2 focus:ring-brand/30 disabled:bg-surface-2 disabled:text-slate',
            dense ? 'h-10 px-3' : 'h-11 px-3',
            Icon && 'pl-9',
            error && 'border-danger focus:border-danger focus:ring-danger/20',
            inputClassName
          )}
          {...props}
        />
      </span>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
      {!error && hint ? <span className="text-xs text-ink-muted">{hint}</span> : null}
    </label>
  );
}
