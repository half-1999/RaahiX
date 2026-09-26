import { cn } from '../../utils/cn';

export default function PageHeader({ title, subtitle, description, actions, className }) {
  const caption = subtitle || description;
  return (
    <div className={cn('mb-6 flex flex-wrap items-end justify-between gap-3', className)}>
      <div>
        <h1 className="font-display text-2xl text-ink md:text-3xl">{title}</h1>
        {caption ? <p className="mt-1 text-sm text-ink-muted">{caption}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
