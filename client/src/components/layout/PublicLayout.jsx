import { Link, Outlet, useLocation } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Logo from '../brand/Logo';
import ThemeToggle from '../brand/ThemeToggle';
import ProfileMenu from './ProfileMenu';
import DownloadAppBanner from '../pwa/DownloadAppBanner';
import { cn } from '../../utils/cn';

const iconBtn =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-ink transition hover:border-brand hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark';

function homePathForRole(role) {
  if (role === 'DRIVER') return '/driver';
  if (role === 'ADMIN') return '/admin';
  if (role === 'CUSTOMER') return '/app';
  return '/';
}

export default function PublicLayout() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const isAuthPage =
    location.pathname === '/login' || location.pathname.startsWith('/register');
  const logoTo = isAuthenticated ? homePathForRole(user?.role) : '/';

  return (
    <div className={cn('bg-surface text-ink', isAuthPage ? 'h-dvh overflow-hidden' : 'min-h-dvh')}>
      <a href="#content" className="skip-link">
        Skip to content
      </a>
      <header className="print-hide sticky top-0 z-40 border-b border-line bg-white">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4 py-2">
          <Link
            to={logoTo}
            aria-label="RaahiX"
            className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark"
          >
            <Logo size="sm" />
          </Link>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <ProfileMenu />
            ) : (
              <>
                <Link to="/login" className={iconBtn} aria-label="Log in" title="Log in">
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                </Link>
                <ThemeToggle />
              </>
            )}
          </div>
        </div>
      </header>
      <main id="content" className={isAuthPage ? 'h-[calc(100dvh-4rem)] overflow-hidden' : 'min-h-dvh'}>
        <Outlet />
      </main>
      {isAuthPage ? null : (
        <footer className="print-hide border-t border-line bg-white text-ink">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Logo size="sm" />
              <p className="mt-3 text-sm text-slate">Scheduled Intercity Shared Rides</p>
              <p className="mt-2 font-script text-2xl text-brand-ink">Shehar Se Shehar, Saath Safar.</p>
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
                <a href="/#download-app" className="text-ink hover:underline">
                  Download app
                </a>
                <Link to="/app/trips" className="text-ink hover:underline">
                  Account
                </Link>
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
            <DownloadAppBanner compact />
          </div>
          <div className="border-t border-line">
            <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-xs text-slate sm:flex-row sm:items-center sm:justify-between">
              <p>© {new Date().getFullYear()} RaahiX. Scheduled intercity shared rides.</p>
              <p className="sm:text-right">
                Sponsored by <span className="font-bold text-brand">Raahi Sharma</span>
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
