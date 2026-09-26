import { cn } from '../../utils/cn';

export default function Spinner({ className, label = 'Loading' }) {
  return (
    <div className={cn('flex items-center justify-center gap-2 text-ink-muted', className)} role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-r-transparent" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
