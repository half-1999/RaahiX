import { cn } from '../../utils/cn';

export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-2xl border-2 border-ink/15 bg-white text-ink shadow-[0_1px_0_rgba(23,23,23,0.03)]',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-1.5 p-5 pb-0', className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn('font-display text-lg font-semibold leading-none', className)} {...props} />;
}

export function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm leading-relaxed text-slate', className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }) {
  return <div className={cn('flex items-center p-5 pt-0', className)} {...props} />;
}
