import { cn } from '../../utils/cn';

const NAVY = '#101828';
const INDIGO = '#635BFF';

function Wordmark({ word, accent, className }) {
  return (
    <svg
      viewBox="0 0 252 86"
      className={cn('h-8 w-auto', className)}
      role="img"
      aria-label="RaahiX"
    >
      <g fill="none" stroke={word} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 62 V16" />
        <path d="M10 16 H24 C38 16 38 40 24 40 H10" />
        <path d="M20 40 L36 62" />
        <path d="M68 62 V38" />
        <path d="M68 50 C68 36 46 36 46 50 C46 64 68 64 68 50" />
        <path d="M104 62 V38" />
        <path d="M104 50 C104 36 82 36 82 50 C82 64 104 64 104 50" />
        <path d="M122 62 V16" />
        <path d="M122 40 C122 28 148 28 148 44 V62" />
        <path d="M170 64 V40" />
      </g>
      <circle cx="170" cy="24" r="3.6" fill={word} />
      <g fill="none" stroke={accent} strokeWidth="13" strokeLinecap="round">
        <path d="M164 8 L190 34" />
        <path d="M236 8 L210 34" />
        <path d="M164 78 L190 52" />
        <path d="M236 78 L210 52" />
      </g>
    </svg>
  );
}

function Mark({ accent, className }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('h-9 w-9', className)} role="img" aria-label="RaahiX">
      <rect width="64" height="64" rx="16" fill={NAVY} />
      <g fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round">
        <path d="M16 16 L26 26" />
        <path d="M48 16 L38 26" />
        <path d="M16 48 L26 38" />
        <path d="M48 48 L38 38" />
      </g>
    </svg>
  );
}

export default function Logo({ className, markOnly = false, inverted = false, mono = false }) {
  const word = inverted ? '#FFFFFF' : NAVY;
  const accent = mono ? word : INDIGO;
  if (markOnly) return <Mark accent={accent} className={className} />;
  return <Wordmark word={word} accent={accent} className={className} />;
}
