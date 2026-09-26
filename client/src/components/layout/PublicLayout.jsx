import { Link, NavLink, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import { cn } from '../../utils/cn';

const navLinkClass = ({ isActive }) =>
  cn(
    'text-sm font-medium transition hover:text-brand',
    isActive ? 'text-brand' : 'text-ink-muted'
  );

export default function PublicLayout() {
  const { user, logout, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="sticky top-0 z-40 border-b border-line/80 bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="font-display text-xl tracking-tight text-brand">
            RouteSeat
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <NavLink to="/search" className={navLinkClass}>
              Find rides
            </NavLink>
            {isAuthenticated ? (
              <>
                <NavLink to="/my-bookings" className={navLinkClass}>
                  My bookings
                </NavLink>
                <NavLink to="/profile" className={navLinkClass}>
                  Profile
                </NavLink>
                {user?.role === 'DRIVER' ? (
                  <NavLink to="/driver" className={navLinkClass}>
                    Driver
                  </NavLink>
                ) : null}
                {user?.role === 'ADMIN' ? (
                  <NavLink to="/admin" className={navLinkClass}>
                    Admin
                  </NavLink>
                ) : null}
                <Button variant="outline" size="sm" onClick={() => logout()}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass}>
                  Log in
                </NavLink>
                <Link
                  to="/register"
                  className="inline-flex h-9 items-center rounded-lg bg-brand px-3 text-sm font-medium text-white hover:bg-brand-dark"
                >
                  Register
                </Link>
              </>
            )}
          </nav>
          <button
            type="button"
            className="rounded-lg p-2 text-ink md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open ? (
          <div className="border-t border-line px-4 py-3 md:hidden">
            <div className="flex flex-col gap-3">
              <Link to="/search" onClick={() => setOpen(false)}>
                Find rides
              </Link>
              {isAuthenticated ? (
                <>
                  <Link to="/my-bookings" onClick={() => setOpen(false)}>
                    My bookings
                  </Link>
                  <Link to="/profile" onClick={() => setOpen(false)}>
                    Profile
                  </Link>
                  <button type="button" className="text-left text-danger" onClick={() => logout()}>
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)}>
                    Log in
                  </Link>
                  <Link to="/register" onClick={() => setOpen(false)}>
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : null}
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="mt-16 border-t border-line bg-surface-2/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-ink-muted md:flex-row md:items-center md:justify-between">
          <p className="font-display text-base text-ink">RouteSeat</p>
          <p>Scheduled shared cabs across Delhi NCR &amp; Uttarakhand corridors.</p>
        </div>
      </footer>
    </div>
  );
}
