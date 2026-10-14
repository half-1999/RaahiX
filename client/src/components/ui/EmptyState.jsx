import { cn } from '../../utils/cn';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-white px-6 py-14 text-center shadow-[var(--shadow-soft)]',
        className
      )}
    >
      {Icon ? (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-ink shadow-[var(--shadow-lift)]">
          <Icon className="h-6 w-6" />
        </div>
      ) : null}
      <h3 className="font-display text-xl font-bold text-navy">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
