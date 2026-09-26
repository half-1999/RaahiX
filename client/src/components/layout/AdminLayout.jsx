import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  Bus,
  CalendarRange,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  MapPinned,
  Menu,
  Route,
  ScrollText,
  Users,
  Car,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/drivers', label: 'Drivers', icon: Bus },
  { to: '/admin/vehicles', label: 'Vehicles', icon: Car },
  { to: '/admin/routes', label: 'Routes', icon: Route },
  { to: '/admin/rides', label: 'Rides', icon: CalendarRange },
  { to: '/admin/bookings', label: 'Bookings', icon: ClipboardList },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/reports', label: 'Reports', icon: MapPinned },
  { to: '/admin/audit-logs', label: 'Audit logs', icon: ScrollText },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="space-y-1">
      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
              isActive ? 'bg-brand text-white' : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
            )
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-surface text-ink">
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 border-r border-line bg-white p-4 lg:block">
          <Link to="/admin" className="mb-6 block font-display text-xl text-brand">
            RouteSeat Ops
          </Link>
          {nav}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-white px-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md p-2 lg:hidden"
                onClick={() => setOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <p className="text-sm text-ink-muted">
                Signed in as <span className="font-medium text-ink">{user?.name || 'Admin'}</span>
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Link to="/" className="text-ink-muted hover:text-ink">
                Site
              </Link>
              <button type="button" className="text-ink-muted hover:text-ink" onClick={() => logout()}>
                Log out
              </button>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <aside className="relative z-10 h-full w-72 bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display text-lg text-brand">RouteSeat Ops</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
