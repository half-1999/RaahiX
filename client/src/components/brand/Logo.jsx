import { cn } from '../../utils/cn';
import { useTheme } from '../../context/ThemeContext';

const heights = {
  sm: 'h-14',
  md: 'h-16',
  lg: 'h-20',
};

const LIGHT_LOGO = '/brand/raahix-lockup.png';
const DARK_LOGO = '/brand/raahix-lockup-dark.png?v=3';

export default function Logo({ className, size = 'md' }) {
  const { isDark } = useTheme();
  return (
    <img
      src={isDark ? DARK_LOGO : LIGHT_LOGO}
      alt="RaahiX"
      width={2172}
      height={724}
      className={cn('w-auto max-w-[min(100%,320px)] object-contain', heights[size], className)}
    />
  );
}
