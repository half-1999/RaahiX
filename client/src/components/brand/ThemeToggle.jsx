import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../utils/cn';

export default function ThemeToggle({ className }) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-ink transition hover:border-brand hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark',
        className
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      title={isDark ? 'Light mode' : 'Dark mode'}
      onClick={toggleTheme}
    >
      {isDark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
}
