import { useEffect, useRef } from 'react';
import { Timer } from 'lucide-react';
import useHoldTimer from '../../hooks/useHoldTimer';
import Alert from '../ui/Alert';
import { cn } from '../../utils/cn';

export default function HoldTimer({ expiresAt, onExpire, className }) {
  const { label, expired, remainingMs } = useHoldTimer(expiresAt);
  const fired = useRef(false);

  useEffect(() => {
    fired.current = false;
  }, [expiresAt]);

  useEffect(() => {
    if (expired && !fired.current) {
      fired.current = true;
      onExpire?.();
    }
  }, [expired, onExpire]);

  if (!expiresAt) return null;

  if (expired) {
    return (
      <Alert tone="warning" title="Seat hold expired" className={className}>
        Please select seats again.
      </Alert>
    );
  }

  const urgent = remainingMs < 2 * 60 * 1000;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
        urgent ? 'border-warning/40 bg-warning/10 text-warning' : 'border-brand/30 bg-brand-soft text-brand-dark',
        className
      )}
      role="timer"
      aria-live="polite"
    >
      <Timer className="h-4 w-4" />
      <span>
        Hold expires in <strong className="font-semibold tabular-nums">{label}</strong>
      </span>
    </div>
  );
}
