import { cn } from '../../utils/cn';

const Pin = ({ className, x = 0, y = 0 }) => (
  <g transform={`translate(${x} ${y})`} className={className}>
    <path
      d="M18 0C8.06 0 0 8.06 0 18c0 12.75 18 30 18 30s18-17.25 18-30C36 8.06 27.94 0 18 0z"
      fill="#FFD43B"
    />
    <circle cx="18" cy="17" r="7" fill="#171717" />
  </g>
);

export function HeroRouteArt({ className }) {
  return (
    <svg
      viewBox="0 0 640 380"
      className={cn('h-auto w-full', className)}
      role="img"
      aria-label="Yellow car traveling a curved road between two city pins"
    >
      <defs>
        <linearGradient id="rx-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF8E1" />
          <stop offset="100%" stopColor="#F5F3EC" />
        </linearGradient>
        <filter id="rx-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#171717" floodOpacity="0.12" />
        </filter>
      </defs>
      <rect width="640" height="380" rx="28" fill="url(#rx-sky)" />
      <g data-parallax="cloud" opacity="0.55" fill="#FFFFFF">
        <ellipse cx="120" cy="58" rx="36" ry="16" />
        <ellipse cx="148" cy="58" rx="24" ry="12" />
        <ellipse cx="500" cy="48" rx="40" ry="16" />
        <ellipse cx="530" cy="48" rx="22" ry="11" />
      </g>
      <g data-parallax="city" opacity="0.32" fill="#171717">
        <rect x="48" y="148" width="28" height="72" rx="4" />
        <rect x="82" y="128" width="36" height="92" rx="4" />
        <rect x="124" y="156" width="24" height="64" rx="4" />
        <rect x="470" y="136" width="30" height="84" rx="4" />
        <rect x="508" y="116" width="42" height="104" rx="4" />
        <rect x="556" y="150" width="26" height="70" rx="4" />
      </g>
      <circle data-parallax="marker" cx="210" cy="210" r="5" fill="#FFD43B" />
      <circle data-parallax="marker" cx="430" cy="188" r="4" fill="#171717" opacity="0.35" />
      <path
        d="M40 280 C160 220, 250 330, 340 270 S520 190, 610 250"
        fill="none"
        stroke="#171717"
        strokeWidth="32"
        strokeLinecap="round"
        data-parallax="road"
      />
      <path
        d="M40 280 C160 220, 250 330, 340 270 S520 190, 610 250"
        fill="none"
        stroke="#FFD43B"
        strokeWidth="4"
        strokeDasharray="14 16"
        strokeLinecap="round"
        opacity="0.95"
        data-parallax="road"
      />
      <g data-parallax="pin-a">
        <Pin x="92" y="98" />
      </g>
      <g data-parallax="pin-b">
        <Pin x="508" y="68" />
      </g>
      <g filter="url(#rx-soft)" data-parallax="car">
        <ellipse cx="318" cy="292" rx="78" ry="14" fill="#171717" opacity="0.12" />
        <rect x="248" y="224" width="148" height="52" rx="22" fill="#FFD43B" />
        <path d="M278 224h72l18 28H260z" fill="#FFF8D6" />
        <rect x="286" y="230" width="28" height="18" rx="4" fill="#171717" opacity="0.2" />
        <rect x="324" y="230" width="28" height="18" rx="4" fill="#171717" opacity="0.2" />
        <circle cx="276" cy="278" r="18" fill="#171717" />
        <circle cx="276" cy="278" r="8" fill="#E8E5DE" />
        <circle cx="372" cy="278" r="18" fill="#171717" />
        <circle cx="372" cy="278" r="8" fill="#E8E5DE" />
        <circle cx="392" cy="242" r="5" fill="#171717" />
      </g>
    </svg>
  );
}

export function SearchRouteArt({ className }) {
  return (
    <svg viewBox="0 0 200 140" className={cn('h-auto w-full', className)} aria-hidden="true">
      <rect width="200" height="140" rx="20" fill="#F5F3EC" />
      <path d="M24 98 C70 60, 120 120, 176 78" fill="none" stroke="#171717" strokeWidth="10" strokeLinecap="round" />
      <path d="M24 98 C70 60, 120 120, 176 78" fill="none" stroke="#FFD43B" strokeWidth="2" strokeDasharray="6 8" />
      <circle cx="34" cy="70" r="10" fill="#FFD43B" />
      <circle cx="166" cy="54" r="10" fill="#FFD43B" />
      <rect x="78" y="72" width="44" height="18" rx="8" fill="#FFD43B" />
      <circle cx="88" cy="92" r="6" fill="#171717" />
      <circle cx="112" cy="92" r="6" fill="#171717" />
    </svg>
  );
}

export function ScheduleArt({ className }) {
  return (
    <svg viewBox="0 0 200 140" className={cn('h-auto w-full', className)} aria-hidden="true">
      <rect width="200" height="140" rx="20" fill="#F5F3EC" />
      <rect x="28" y="28" width="70" height="72" rx="12" fill="#FFFFFF" stroke="#E8E5DE" />
      <rect x="28" y="28" width="70" height="18" rx="12" fill="#FFD43B" />
      <circle cx="48" cy="62" r="4" fill="#171717" />
      <circle cx="64" cy="62" r="4" fill="#171717" />
      <circle cx="80" cy="62" r="4" fill="#FFD43B" />
      <circle cx="48" cy="78" r="4" fill="#171717" opacity="0.35" />
      <circle cx="64" cy="78" r="4" fill="#171717" opacity="0.35" />
      <circle cx="138" cy="70" r="34" fill="#FFFFFF" stroke="#E8E5DE" strokeWidth="4" />
      <circle cx="138" cy="70" r="4" fill="#171717" />
      <path d="M138 48v24l14 8" fill="none" stroke="#FFD43B" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function SeatMapArt({ className }) {
  return (
    <svg viewBox="0 0 200 140" className={cn('h-auto w-full', className)} aria-hidden="true">
      <rect width="200" height="140" rx="20" fill="#F5F3EC" />
      <rect x="58" y="18" width="84" height="104" rx="28" fill="#FFFFFF" stroke="#E8E5DE" strokeWidth="3" />
      <rect x="84" y="28" width="32" height="14" rx="4" fill="#171717" opacity="0.15" />
      <rect x="72" y="52" width="22" height="18" rx="5" fill="#E8E5DE" />
      <rect x="106" y="52" width="22" height="18" rx="5" fill="#FFD43B" />
      <rect x="72" y="78" width="22" height="18" rx="5" fill="#FFD43B" />
      <rect x="106" y="78" width="22" height="18" rx="5" fill="#171717" opacity="0.28" />
      <rect x="72" y="104" width="22" height="10" rx="4" fill="#FFD43B" />
      <rect x="106" y="104" width="22" height="10" rx="4" fill="#E8E5DE" />
    </svg>
  );
}

export function PublishedRoutesArt({ className }) {
  return (
    <svg
      viewBox="0 0 280 200"
      className={cn('h-auto w-full', className)}
      role="img"
      aria-label="Route map with city pins and a yellow car"
    >
      <rect width="280" height="200" rx="28" fill="#F5F3EC" />
      <circle cx="56" cy="48" r="28" fill="#FFD43B" opacity="0.28" />
      <circle cx="230" cy="160" r="36" fill="#171717" opacity="0.06" />
      <path
        d="M32 148 C88 100, 120 160, 168 118 S230 88, 256 118"
        fill="none"
        stroke="#171717"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d="M32 148 C88 100, 120 160, 168 118 S230 88, 256 118"
        fill="none"
        stroke="#FFD43B"
        strokeWidth="2.5"
        strokeDasharray="7 9"
        strokeLinecap="round"
      />
      <g transform="translate(40 52) scale(0.7)">
        <Pin />
      </g>
      <g transform="translate(198 42) scale(0.7)">
        <Pin />
      </g>
      <rect x="108" y="118" width="58" height="22" rx="10" fill="#FFD43B" />
      <path d="M120 118h28l10 14H110z" fill="#FFF8D6" />
      <circle cx="120" cy="142" r="7" fill="#171717" />
      <circle cx="148" cy="142" r="7" fill="#171717" />
      <rect x="36" y="28" width="72" height="36" rx="12" fill="#FFFFFF" stroke="#E8E5DE" />
      <rect x="46" y="38" width="28" height="6" rx="3" fill="#171717" opacity="0.2" />
      <rect x="46" y="50" width="44" height="6" rx="3" fill="#FFD43B" />
    </svg>
  );
}

export function EmptyRoutesArt({ className }) {
  return (
    <svg
      viewBox="0 0 360 200"
      className={cn('h-auto w-full max-w-md', className)}
      role="img"
      aria-label="Yellow car on an open road between two location pins"
    >
      <rect width="360" height="200" rx="24" fill="#F5F3EC" />
      <path d="M28 140 C110 90, 180 170, 240 120 S320 90, 340 120" fill="none" stroke="#171717" strokeWidth="16" strokeLinecap="round" />
      <path d="M28 140 C110 90, 180 170, 240 120 S320 90, 340 120" fill="none" stroke="#FFD43B" strokeWidth="2.5" strokeDasharray="8 10" />
      <Pin x="48" y="58" />
      <g transform="translate(268 42) scale(0.85)">
        <Pin />
      </g>
      <rect x="148" y="108" width="64" height="24" rx="10" fill="#FFD43B" />
      <circle cx="160" cy="134" r="8" fill="#171717" />
      <circle cx="196" cy="134" r="8" fill="#171717" />
    </svg>
  );
}

export function DriverPublishArt({ className }) {
  return (
    <svg
      viewBox="0 0 320 220"
      className={cn('h-auto w-full', className)}
      role="img"
      aria-label="Car with a route card and open seats"
    >
      <rect width="320" height="220" rx="28" fill="#1F1F1F" />
      <path d="M24 150 C90 110, 140 180, 200 140 S280 100, 304 130" fill="none" stroke="#FFD43B" strokeWidth="8" strokeLinecap="round" />
      <rect x="176" y="36" width="116" height="78" rx="16" fill="#FFFFFF" />
      <rect x="188" y="48" width="56" height="8" rx="4" fill="#171717" opacity="0.2" />
      <rect x="188" y="64" width="92" height="8" rx="4" fill="#FFD43B" />
      <rect x="188" y="84" width="18" height="14" rx="4" fill="#FFD43B" />
      <rect x="212" y="84" width="18" height="14" rx="4" fill="#E8E5DE" />
      <rect x="236" y="84" width="18" height="14" rx="4" fill="#FFD43B" />
      <rect x="48" y="112" width="96" height="36" rx="14" fill="#FFD43B" />
      <circle cx="68" cy="152" r="10" fill="#FFFFFF" />
      <circle cx="120" cy="152" r="10" fill="#FFFFFF" />
    </svg>
  );
}

export function LoginWelcomeArt({ className }) {
  return (
    <svg
      viewBox="0 0 480 520"
      className={cn('h-auto w-full', className)}
      role="img"
      aria-label="Welcome back illustration with a yellow car and city route"
    >
      <defs>
        <linearGradient id="rx-login-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF8E1" />
          <stop offset="100%" stopColor="#F5F3EC" />
        </linearGradient>
      </defs>
      <rect width="480" height="520" rx="36" fill="url(#rx-login-sky)" />
      <ellipse cx="120" cy="88" rx="42" ry="18" fill="#FFFFFF" opacity="0.7" />
      <ellipse cx="360" cy="70" rx="48" ry="20" fill="#FFFFFF" opacity="0.7" />
      <g opacity="0.28" fill="#171717">
        <rect x="48" y="190" width="34" height="90" rx="5" />
        <rect x="90" y="160" width="44" height="120" rx="5" />
        <rect x="142" y="200" width="28" height="80" rx="5" />
        <rect x="310" y="170" width="36" height="110" rx="5" />
        <rect x="354" y="150" width="50" height="130" rx="5" />
        <rect x="412" y="195" width="30" height="85" rx="5" />
      </g>
      <path
        d="M36 380 C140 300, 220 430, 300 350 S420 280, 460 340"
        fill="none"
        stroke="#171717"
        strokeWidth="36"
        strokeLinecap="round"
      />
      <path
        d="M36 380 C140 300, 220 430, 300 350 S420 280, 460 340"
        fill="none"
        stroke="#FFD43B"
        strokeWidth="4"
        strokeDasharray="12 14"
        strokeLinecap="round"
      />
      <Pin x="88" y="210" />
      <g transform="translate(360 180)">
        <Pin />
      </g>
      <ellipse cx="250" cy="400" rx="84" ry="16" fill="#171717" opacity="0.1" />
      <rect x="176" y="320" width="156" height="56" rx="24" fill="#FFD43B" />
      <path d="M208 320h76l20 30H188z" fill="#FFF8D6" />
      <circle cx="206" cy="380" r="18" fill="#171717" />
      <circle cx="206" cy="380" r="8" fill="#E8E5DE" />
      <circle cx="308" cy="380" r="18" fill="#171717" />
      <circle cx="308" cy="380" r="8" fill="#E8E5DE" />
      <rect x="196" y="248" width="100" height="56" rx="18" fill="#FFFFFF" stroke="#E8E5DE" />
      <circle cx="246" cy="276" r="16" fill="#FFD43B" />
      <path d="M246 268v16M238 276h16" stroke="#171717" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function SignupWelcomeArt({ className }) {
  return (
    <svg
      viewBox="0 0 480 520"
      className={cn('h-auto w-full', className)}
      role="img"
      aria-label="Join RaahiX illustration with seats and a new journey"
    >
      <defs>
        <linearGradient id="rx-signup-sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#171717" />
          <stop offset="100%" stopColor="#2A2A2A" />
        </linearGradient>
      </defs>
      <rect width="480" height="520" rx="36" fill="url(#rx-signup-sky)" />
      <circle cx="90" cy="90" r="48" fill="#FFD43B" opacity="0.18" />
      <circle cx="400" cy="430" r="70" fill="#FFD43B" opacity="0.12" />
      <path
        d="M40 360 C130 290, 200 400, 280 330 S390 250, 450 300"
        fill="none"
        stroke="#FFD43B"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <rect x="64" y="96" width="160" height="120" rx="24" fill="#FFFFFF" />
      <rect x="84" y="118" width="72" height="10" rx="5" fill="#171717" opacity="0.2" />
      <rect x="84" y="140" width="120" height="10" rx="5" fill="#FFD43B" />
      <rect x="84" y="168" width="28" height="22" rx="6" fill="#FFD43B" />
      <rect x="120" y="168" width="28" height="22" rx="6" fill="#E8E5DE" />
      <rect x="156" y="168" width="28" height="22" rx="6" fill="#FFD43B" />
      <rect x="250" y="120" width="150" height="190" rx="40" fill="#FFFFFF" />
      <rect x="292" y="140" width="66" height="22" rx="8" fill="#171717" opacity="0.12" />
      <rect x="276" y="180" width="40" height="32" rx="8" fill="#E8E5DE" />
      <rect x="334" y="180" width="40" height="32" rx="8" fill="#FFD43B" />
      <rect x="276" y="228" width="40" height="32" rx="8" fill="#FFD43B" />
      <rect x="334" y="228" width="40" height="32" rx="8" fill="#171717" opacity="0.25" />
      <rect x="276" y="276" width="40" height="18" rx="6" fill="#FFD43B" />
      <rect x="334" y="276" width="40" height="18" rx="6" fill="#E8E5DE" />
      <rect x="150" y="360" width="170" height="48" rx="18" fill="#FFD43B" />
      <circle cx="178" cy="416" r="14" fill="#FFFFFF" />
      <circle cx="292" cy="416" r="14" fill="#FFFFFF" />
      <circle cx="240" cy="468" r="8" fill="#FFD43B" />
    </svg>
  );
}
