import { cn } from '../../utils/cn';

const variants = {
  primary:
    'bg-brand text-white hover:bg-brand-dark focus-visible:ring-brand disabled:bg-brand/50',
  secondary:
    'bg-surface-2 text-ink hover:bg-line focus-visible:ring-brand/40 disabled:opacity-50',
  outline:
    'border border-line bg-white text-ink hover:bg-surface-2 focus-visible:ring-brand/40',
  ghost: 'text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:ring-brand/30',
  danger: 'bg-danger text-white hover:bg-danger/90 focus-visible:ring-danger',
  accent: 'bg-accent text-white hover:bg-accent/90 focus-visible:ring-accent',
};

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

export default function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
      ) : null}
      {children}
    </button>
  );
}
