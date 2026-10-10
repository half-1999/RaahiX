import { Link, NavLink, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import Logo from '../brand/Logo';
import { cn } from '../../utils/cn';

const navLinkClass = ({ isActive }) =>
  cn(
    'text-sm font-semibold transition hover:text-brand',
    isActive ? 'text-brand' : 'text-slate'
  );

export default function PublicLayout() {
  const { user, logout, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-surface text-ink">
      <header className="print-hide sticky top-0 z-40 border-b border-line/80 bg-ivory/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="shrink-0" onClick={() => setOpen(false)}>
            <Logo />
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
                <NavLink to="/notifications" className={navLinkClass}>
                  Alerts
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
                <Link to="/register">
                  <Button size="sm">Register</Button>
                </Link>
              </>
            )}
          </nav>
          <button
            type="button"
            className="rounded-xl p-2 text-navy md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open ? (
          <div className="border-t border-line bg-white px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3 text-sm font-semibold text-navy">
              <Link to="/search" onClick={() => setOpen(false)}>
                Find rides
              </Link>
              {isAuthenticated ? (
                <>
                  <Link to="/my-bookings" onClick={() => setOpen(false)}>
                    My bookings
                  </Link>
                  <Link to="/notifications" onClick={() => setOpen(false)}>
                    Alerts
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
      <main className="min-h-dvh">
        <Outlet />
      </main>
      <footer className="print-hide mt-20 border-t border-line bg-navy text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <Logo inverted />
            <p className="mt-3 max-w-sm text-sm text-white/70">
              Intercity seats you can choose — transparent fares, verified cabs, and a booking flow
              built for calm travel.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-coral">Explore</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-white/80">
              <Link to="/search" className="hover:text-white">
                Find rides
              </Link>
              <Link to="/register" className="hover:text-white">
                Create account
              </Link>
              <Link to="/login" className="hover:text-white">
                Log in
              </Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-coral">Trust</p>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>Secure payments</li>
              <li>Verified operators</li>
              <li>Transparent seat pricing</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} RaahiX. Scheduled intercity shared rides. Shehar Se Shehar, Saath Safar.
            </p>
            <p>
              Designed and Developed by{' '}
              <a
                href="https://thestackguy.in"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-coral transition hover:text-white"
              >
                The Stack Guy
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
