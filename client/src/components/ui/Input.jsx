import { cn } from '../../utils/cn';

export default function Input({
  label,
  error,
  hint,
  className,
  id,
  ...props
}) {
  const inputId = id || props.name;
  return (
    <label className="block space-y-1.5">
      {label ? (
        <span className="text-sm font-medium text-ink">{label}</span>
      ) : null}
      <input
        id={inputId}
        className={cn(
          'h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-ink-muted/70 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-surface-2',
          error && 'border-danger focus:border-danger focus:ring-danger/20',
          className
        )}
        {...props}
      />
      {error ? <span className="text-xs text-danger">{error}</span> : null}
      {!error && hint ? <span className="text-xs text-ink-muted">{hint}</span> : null}
    </label>
  );
}
