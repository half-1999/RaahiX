import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  LogOut,
  Moon,
  Sun,
  Ticket,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../utils/cn';

const iconBtn =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-ink transition hover:border-brand hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark';

function pathsForRole(role) {
  if (role === 'DRIVER') {
    return {
      dashboard: '/driver',
      profile: '/driver/profile',
      trips: '/driver/rides',
      tripsLabel: 'My rides',
    };
  }
  if (role === 'ADMIN') {
    return {
      dashboard: '/admin',
      profile: '/profile',
      trips: '/admin/bookings',
      tripsLabel: 'Bookings',
    };
  }
  return {
    dashboard: '/app',
    profile: '/app/profile',
    trips: '/app/trips',
    tripsLabel: 'My trips',
  };
}

export default function ProfileMenu({ className }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  const paths = pathsForRole(user.role);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        className={iconBtn}
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Account"
        onClick={() => setOpen((o) => !o)}
      >
        <UserRound className="h-4 w-4" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border-2 border-ink/10 bg-white shadow-[var(--shadow-lift)]"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate font-semibold text-ink">{user.name || 'Account'}</p>
            <p className="truncate text-xs text-ink-muted">{user.email}</p>
          </div>
          <div className="py-1">
            <Link
              role="menuitem"
              to={paths.dashboard}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface"
              onClick={() => setOpen(false)}
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              Dashboard
            </Link>
            <Link
              role="menuitem"
              to={paths.profile}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface"
              onClick={() => setOpen(false)}
            >
              <UserRound className="h-4 w-4" aria-hidden="true" />
              Profile
            </Link>
            <Link
              role="menuitem"
              to={paths.trips}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface"
              onClick={() => setOpen(false)}
            >
              <Ticket className="h-4 w-4" aria-hidden="true" />
              {paths.tripsLabel}
            </Link>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-ink hover:bg-surface"
              onClick={() => {
                toggleTheme();
              }}
            >
              {isDark ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )}
              {isDark ? 'Light mode' : 'Dark mode'}
            </button>
          </div>
          <div className="border-t border-line py-1">
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-danger hover:bg-danger/10"
              onClick={() => {
                setOpen(false);
                logout();
              }}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Log out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
