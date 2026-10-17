import { cn } from '../../utils/cn';

/**
 * Lightweight SVG empty-state for ride search.
 * Respects prefers-reduced-motion via CSS (see index.css .rx-search-empty).
 */
export default function SearchEmptyIllustration({ className }) {
  return (
    <svg
      viewBox="0 0 480 280"
      className={cn('rx-search-empty mx-auto h-auto w-full max-w-md', className)}
      role="img"
      aria-label="Car searching along a road between city pins — no matching rides yet"
    >
      <defs>
        <linearGradient id="rx-empty-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF8E1" />
          <stop offset="100%" stopColor="#F5F3EC" />
        </linearGradient>
      </defs>
      <rect width="480" height="280" rx="24" fill="url(#rx-empty-sky)" />

      <g className="rx-empty-cloud" fill="#FFFFFF" opacity="0.65">
        <ellipse cx="90" cy="48" rx="28" ry="12" />
        <ellipse cx="112" cy="48" rx="18" ry="9" />
        <ellipse cx="380" cy="40" rx="32" ry="13" />
        <ellipse cx="404" cy="40" rx="16" ry="8" />
      </g>

      <g opacity="0.28" fill="#171717">
        <rect x="36" y="110" width="20" height="52" rx="3" />
        <rect x="60" y="96" width="26" height="66" rx="3" />
        <rect x="390" y="100" width="22" height="58" rx="3" />
        <rect x="418" y="88" width="30" height="70" rx="3" />
      </g>

      <path
        className="rx-empty-road"
        d="M28 210 C120 160, 180 240, 250 200 S360 150, 452 190"
        fill="none"
        stroke="#171717"
        strokeWidth="26"
        strokeLinecap="round"
      />
      <path
        className="rx-empty-dashes"
        d="M28 210 C120 160, 180 240, 250 200 S360 150, 452 190"
        fill="none"
        stroke="#FFD43B"
        strokeWidth="3"
        strokeDasharray="12 14"
        strokeLinecap="round"
      />

      <g transform="translate(70 72)">
        <path
          d="M14 0C6.3 0 0 6.3 0 14c0 10 14 24 14 24s14-14 14-24C28 6.3 21.7 0 14 0z"
          fill="#FFD43B"
        />
        <circle cx="14" cy="13" r="5" fill="#171717" />
      </g>
      <g transform="translate(390 58)">
        <path
          d="M14 0C6.3 0 0 6.3 0 14c0 10 14 24 14 24s14-14 14-24C28 6.3 21.7 0 14 0z"
          fill="#FFD43B"
        />
        <circle cx="14" cy="13" r="5" fill="#171717" />
      </g>

      <g className="rx-empty-car">
        <ellipse cx="240" cy="218" rx="54" ry="10" fill="#171717" opacity="0.12" />
        <rect x="192" y="168" width="100" height="36" rx="16" fill="#FFD43B" />
        <path d="M212 168h48l12 20H200z" fill="#FFF8D6" />
        <circle cx="212" cy="206" r="12" fill="#171717" />
        <circle cx="212" cy="206" r="5" fill="#E8E5DE" />
        <circle cx="276" cy="206" r="12" fill="#171717" />
        <circle cx="276" cy="206" r="5" fill="#E8E5DE" />
      </g>

      <g className="rx-empty-spark" fill="#8a6d00" opacity="0.5">
        <circle cx="160" cy="130" r="3" />
        <circle cx="320" cy="118" r="2.5" />
        <circle cx="280" cy="140" r="2" />
      </g>
    </svg>
  );
}
