import { cn } from '../../utils/cn';

const tones = {
  neutral: 'bg-mist text-navy',
  brand: 'bg-indigo-soft text-indigo-dark',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  accent: 'bg-coral-soft text-coral',
};

export default function Badge({ children, tone = 'neutral', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold tracking-wide',
        tones[tone] || tones.neutral,
        className
      )}
    >
      {children}
    </span>
  );
}
