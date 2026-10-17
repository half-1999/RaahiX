import { cn } from '../../utils/cn';

export default function PageHeader({
  title,
  subtitle,
  description,
  actions,
  className,
  /** Put title + subtitle on one row when space allows */
  inline = false,
}) {
  const caption = subtitle || description;
  return (
    <div
      className={cn(
        'mb-4 flex flex-col gap-3 sm:mb-6',
        inline
          ? 'sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between'
          : 'sm:flex-row sm:flex-wrap sm:items-end sm:justify-between',
        className
      )}
    >
      <div
        className={cn(
          'min-w-0 flex-1',
          inline && 'sm:flex sm:flex-wrap sm:items-baseline sm:gap-x-3 sm:gap-y-1'
        )}
      >
        <h1 className="dashboard-title font-display font-bold text-ink">{title}</h1>
        {caption ? (
          <p
            className={cn(
              'dashboard-text text-ink-muted',
              inline ? 'mt-1 sm:mt-0' : 'mt-1'
            )}
          >
            {caption}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:shrink-0">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
