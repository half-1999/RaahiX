import { cn } from '../../utils/cn';

const variants = {
  primary: 'rx-btn rx-btn-primary',
  secondary: 'rx-btn rx-btn-secondary',
  outline: 'rx-btn rx-btn-outline',
  ghost: 'rx-btn rx-btn-ghost',
  danger: 'rx-btn rx-btn-danger',
  accent: 'rx-btn rx-btn-primary',
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
        'inline-flex items-center justify-center gap-2 font-semibold transition duration-200 focus-visible:outline-none',
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
