import { cn } from '../../utils/cn';

export default function Select({
  label,
  error,
  hint,
  className,
  id,
  children,
  options,
  placeholder,
  ...props
}) {
  const selectId = id || props.name;
  return (
    <label className="block space-y-1.5">
      {label ? (
        <span className="text-sm font-medium text-ink">{label}</span>
      ) : null}
      <select
        id={selectId}
        className={cn(
          'h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-black outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-surface-2 disabled:text-black/60',
          error && 'border-danger focus:border-danger focus:ring-danger/20',
          className
        )}
        {...props}
      >
        {placeholder ? (
          <option value="">{placeholder}</option>
        ) : null}
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
      {!error && hint ? <span className="text-xs text-ink-muted">{hint}</span> : null}
    </label>
  );
}
