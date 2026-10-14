import { useTheme } from '../../context/ThemeContext';
import Button from '../ui/Button';

export default function ThemeToggle({ className }) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      aria-pressed={isDark}
      onClick={toggleTheme}
    >
      {isDark ? 'Light' : 'Dark'}
    </Button>
  );
}
