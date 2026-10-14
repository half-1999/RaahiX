import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import Logo from '../brand/Logo';
import ThemeToggle from '../brand/ThemeToggle';
import DownloadAppButton from '../pwa/DownloadAppButton';
import { cn } from '../../utils/cn';

const links = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/search', label: 'Find rides' },
  { href: '/#for-drivers', label: 'For drivers' },
];

const linkClass =
  'text-sm font-semibold text-slate transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark focus-visible:ring-offset-2';

function navClass({ isActive }) {
  return cn(linkClass, isActive && 'text-ink');
}

export default function PublicLayout() {
  const { user, logout, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const showDownload = pathname === '/';
  const close = () => setOpen(false);

  return (
    <div className="min-h-dvh bg-surface text-ink">
      <a href="#content" className="skip-link">
        Skip to content
      </a>
      <header className="print-hide sticky top-0 z-40 border-b border-line bg-white">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4 py-2">
          <Link to="/" aria-label="RaahiX" className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark" onClick={close}>
            <Logo size="sm" />
          </Link>
          <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
            {links.map((item) =>
              item.href.startsWith('/#') ? (
                <a key={item.href} href={item.href} className={linkClass}>
                  {item.label}
                </a>
              ) : (
                <NavLink key={item.href} to={item.href} className={navClass}>
                  {item.label}
                </NavLink>
              )
            )}
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 lg:flex">
              {isAuthenticated ? (
                <>
                  <NavLink to="/my-bookings" className={navClass}>
                    My bookings
                  </NavLink>
                  {user?.role === 'DRIVER' ? (
                    <NavLink to="/driver" className={navClass}>
                      Driver
                    </NavLink>
                  ) : null}
                  {user?.role === 'ADMIN' ? (
                    <NavLink to="/admin" className={navClass}>
                      Admin
                    </NavLink>
                  ) : null}
                  <Button variant="outline" size="sm" onClick={() => logout()}>
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <NavLink to="/login" className={navClass}>
                    Log in
                  </NavLink>
                  <Link to="/register/driver">
                    <Button variant="outline" size="sm">
                      Offer a ride
                    </Button>
                  </Link>
                </>
              )}
              <Link to="/search">
                <Button size="sm">Find a ride</Button>
              </Link>
              <ThemeToggle />
            </div>
            {showDownload ? <DownloadAppButton /> : null}
            <button
              type="button"
              className="shrink-0 rounded-xl p-2 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark lg:hidden"
              onClick={() => setOpen((value) => !value)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="mobile-nav"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open ? (
          <div id="mobile-nav" className="border-t border-line bg-white px-4 py-4 lg:hidden">
            <div className="flex flex-col gap-3">
              <ThemeToggle className="w-full lg:hidden" />
              <Link to="/search" onClick={close}>
                <Button className="w-full">Find a ride</Button>
              </Link>
              {links.map((item) =>
                item.href.startsWith('/#') ? (
                  <a key={item.href} href={item.href} onClick={close} className="py-1 text-sm font-semibold text-ink">
                    {item.label}
                  </a>
                ) : (
                  <Link key={item.href} to={item.href} onClick={close} className="py-1 text-sm font-semibold text-ink">
                    {item.label}
                  </Link>
                )
              )}
              {isAuthenticated ? (
                <>
                  <Link to="/my-bookings" onClick={close} className="py-1 text-sm font-semibold text-ink">
                    My bookings
                  </Link>
                  <Link to="/notifications" onClick={close} className="py-1 text-sm font-semibold text-ink">
                    Alerts
                  </Link>
                  <Link to="/profile" onClick={close} className="py-1 text-sm font-semibold text-ink">
                    Profile
                  </Link>
                  {user?.role === 'DRIVER' ? (
                    <Link to="/driver" onClick={close} className="py-1 text-sm font-semibold text-ink">
                      Driver
                    </Link>
                  ) : null}
                  {user?.role === 'ADMIN' ? (
                    <Link to="/admin" onClick={close} className="py-1 text-sm font-semibold text-ink">
                      Admin
                    </Link>
                  ) : null}
                  <button type="button" className="py-1 text-left text-sm font-semibold text-ink" onClick={() => logout()}>
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/register/driver" onClick={close} className="py-1 text-sm font-semibold text-ink">
                    Offer a ride
                  </Link>
                  <Link to="/login" onClick={close} className="py-1 text-sm font-semibold text-ink">
                    Log in
                  </Link>
                  <Link to="/register" onClick={close} className="py-1 text-sm font-semibold text-ink">
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : null}
      </header>
      <main id="content" className="min-h-dvh">
        <Outlet />
      </main>
      <footer className="print-hide border-t border-line bg-white text-ink">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Logo size="sm" />
            <p className="mt-3 text-sm text-slate">Scheduled Intercity Shared Rides</p>
            <p className="mt-2 font-display text-base text-brand-dark">Shehar Se Shehar, Saath Safar.</p>
            <p className="mt-3 text-sm text-slate">
              A product by{' '}
              <a
                href="https://thestackguy.in"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-ink underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark"
              >
                The Stack Guy
              </a>
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">Explore</p>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <Link to="/search" className="text-ink hover:underline">
                Find a ride
              </Link>
              <a href="/#how-it-works" className="text-ink hover:underline">
                How it works
              </a>
              <a href="/#for-drivers" className="text-ink hover:underline">
                For drivers
              </a>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">Account</p>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <Link to="/login" className="text-ink hover:underline">
                Log in
              </Link>
              <Link to="/register" className="text-ink hover:underline">
                Register
              </Link>
              <Link to="/register/driver" className="text-ink hover:underline">
                Offer a ride
              </Link>
            </div>
          </div>
        </div>
        <div className="border-t border-line">
          <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate">
            © {new Date().getFullYear()} RaahiX. Scheduled intercity shared rides.
          </p>
        </div>
      </footer>
    </div>
  );
}
