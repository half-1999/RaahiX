import { cn } from '../../utils/cn';

const variants = {
  primary:
    'bg-brand bg-brand-gradient text-white shadow-[var(--shadow-lift)] hover:brightness-105 active:scale-[0.98] focus-visible:ring-brand',
  secondary:
    'bg-mist text-black hover:bg-indigo-soft focus-visible:ring-brand/40 active:scale-[0.98]',
  outline:
    'border border-line bg-white text-black hover:border-brand/40 hover:bg-mist focus-visible:ring-brand/40 active:scale-[0.98]',
  ghost: 'text-black hover:bg-mist hover:text-black focus-visible:ring-brand/30',
  danger: 'bg-danger text-white hover:bg-danger/90 focus-visible:ring-danger active:scale-[0.98]',
  accent:
    'bg-coral text-white hover:brightness-105 focus-visible:ring-coral active:scale-[0.98]',
};

const sizes = {
  sm: 'h-9 rounded-xl px-3 text-sm',
  md: 'h-11 rounded-xl px-4 text-sm',
  lg: 'h-12 rounded-2xl px-5 text-base',
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
        'inline-flex items-center justify-center gap-2 font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
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
