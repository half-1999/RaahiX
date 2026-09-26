import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { cn } from '../../utils/cn';

const styles = {
  info: 'border-brand/30 bg-brand-soft text-brand-dark',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  error: 'border-danger/30 bg-danger/10 text-danger',
};

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
};

export default function Alert({ tone, variant, title, children, className }) {
  const resolved = tone || variant || 'info';
  const Icon = icons[resolved] || Info;
  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 rounded-lg border px-3 py-3 text-sm',
        styles[resolved],
        className
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className={cn(title && 'mt-0.5 opacity-90')}>{children}</div> : null}
      </div>
    </div>
  );
}
