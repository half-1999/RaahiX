import { useState } from 'react';
import { cn } from '../../utils/cn';

export function Avatar({ className, ...props }) {
  return (
    <span
      className={cn(
        'relative flex h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-ink/10 bg-mist',
        className
      )}
      {...props}
    />
  );
}

export function AvatarImage({ className, alt = '', onError, ...props }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      alt={alt}
      className={cn('absolute inset-0 aspect-square h-full w-full object-cover', className)}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
      {...props}
    />
  );
}

export function AvatarFallback({ className, ...props }) {
  return (
    <span
      className={cn(
        'flex h-full w-full items-center justify-center bg-brand text-sm font-bold text-ink',
        className
      )}
      {...props}
    />
  );
}
