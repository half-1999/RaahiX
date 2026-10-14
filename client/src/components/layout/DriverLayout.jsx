import { Link, NavLink, Outlet } from 'react-router-dom';
import { CalendarDays, Car, CreditCard, LayoutDashboard, Route, RotateCcw } from 'lucide-react';
import Logo from '../brand/Logo';
import ThemeToggle from '../brand/ThemeToggle';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';

const items = [
  { to: '/driver', label: 'Today', icon: LayoutDashboard, end: true },
  { to: '/driver/rides', label: 'Rides', icon: CalendarDays },
  { to: '/driver/vehicles', label: 'Vehicles', icon: Car },
  { to: '/driver/routes', label: 'Routes', icon: Route },
  { to: '/driver/payments', label: 'Payments', icon: CreditCard },
  { to: '/driver/refunds', label: 'Refunds', icon: RotateCcw },
];

export default function DriverLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 md:max-w-5xl md:pl-60">
          <div>
            <Link to="/driver" aria-label="RaahiX">
              <Logo size="sm" />
            </Link>
            <p className="text-xs text-ink-muted">{user?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              className="text-sm text-ink-muted hover:text-ink"
              onClick={() => logout()}
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <aside className="fixed top-14 bottom-0 left-0 z-20 hidden w-56 border-r border-line bg-white p-4 md:block">
        <nav className="space-y-1">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
                  isActive ? 'bg-brand-soft text-brand-dark' : 'text-ink-muted hover:bg-surface'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
          <Link
            to="/"
            className="mt-4 block rounded-lg px-3 py-2 text-sm text-ink-muted hover:bg-surface"
          >
            Customer site
          </Link>
        </nav>
      </aside>

      <main className="mx-auto max-w-3xl px-4 py-5 pb-24 md:max-w-5xl md:pl-60 md:pb-8">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white md:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-6">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2 text-xs font-medium',
                  isActive ? 'text-brand-dark' : 'text-ink-muted'
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
