import { cn } from '../../utils/cn';

const heights = {
  sm: 'h-14',
  md: 'h-16',
  lg: 'h-20',
};

export default function Logo({ className, size = 'md' }) {
  return (
    <img
      src="/brand/raahix-lockup.png"
      alt="RaahiX"
      width={2172}
      height={724}
      className={cn('w-auto max-w-[min(100%,320px)] object-contain', heights[size], className)}
    />
  );
}
