import { cn } from '../../utils/cn';

const tones = {
  neutral: 'bg-mist text-navy',
  brand: 'bg-indigo-soft text-indigo-dark',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  accent: 'bg-coral-soft text-coral',
  scheduled: 'bg-[var(--status-scheduled-bg)] text-[var(--status-scheduled-fg)]',
  active: 'bg-[var(--status-active-bg)] text-[var(--status-active-fg)]',
  completed: 'bg-[var(--status-completed-bg)] text-[var(--status-completed-fg)]',
  cancelled: 'bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled-fg)]',
  pending: 'bg-[var(--status-pending-bg)] text-[var(--status-pending-fg)]',
  failed: 'bg-[var(--status-failed-bg)] text-[var(--status-failed-fg)]',
  draft: 'bg-[var(--status-draft-bg)] text-[var(--status-draft-fg)]',
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
