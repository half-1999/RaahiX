import { cn } from '../../utils/cn';

const tones = {
  neutral: 'bg-surface-2 text-ink',
  brand: 'bg-brand-soft text-brand-dark',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  accent: 'bg-accent/10 text-accent',
};

export default function Badge({ children, tone = 'neutral', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        tones[tone] || tones.neutral,
        className
      )}
    >
      {children}
    </span>
  );
}
