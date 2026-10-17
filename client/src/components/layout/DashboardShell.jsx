import { Link, NavLink, Outlet } from 'react-router-dom';
import Logo from '../brand/Logo';
import ProfileMenu from './ProfileMenu';
import { cn } from '../../utils/cn';

function TabLinks({ tabs, compact = false }) {
  return tabs.map(({ to, label, icon: Icon, end }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-center transition',
          compact
            ? 'px-1 py-1.5'
            : 'px-1 py-2 sm:flex-row sm:gap-1.5 sm:px-2 sm:py-2.5',
          isActive
            ? 'bg-brand text-ink shadow-sm'
            : 'text-ink-muted hover:bg-surface hover:text-ink'
        )
      }
    >
      <Icon
        className={cn('shrink-0', compact ? 'h-5 w-5' : 'h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]')}
        aria-hidden="true"
      />
      <span
        className={cn(
          'max-w-full truncate font-bold leading-tight',
          compact ? 'text-[10px]' : 'text-[10px] sm:text-xs md:text-sm'
        )}
      >
        {label}
      </span>
    </NavLink>
  ));
}

/**
 * Shared authenticated app shell.
 * Mobile: tabs fixed to the bottom. Desktop: tabs centered under the header.
 * Header uses a single profile menu (dropdown) — no scattered action icons.
 */
export default function DashboardShell({
  homeTo,
  profileTo,
  tabs,
  banner = null,
  ariaLabel = 'Dashboard',
}) {
  return (
    <div className="dashboard-shell min-h-screen bg-surface text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-white">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4 py-2">
          <Link
            to={homeTo}
            aria-label="RaahiX"
            className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark"
          >
            <Logo size="sm" />
          </Link>
          <ProfileMenu />
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8">
        <nav aria-label={ariaLabel} className="mb-5 hidden justify-center md:flex">
          <div className="flex w-full max-w-3xl items-stretch justify-between gap-1.5 rounded-2xl border-2 border-ink/10 bg-white p-1 shadow-[var(--shadow-soft)]">
            <TabLinks tabs={tabs} />
          </div>
        </nav>

        {banner}
        <Outlet />
      </div>

      <nav
        aria-label={ariaLabel}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="mx-auto flex max-w-6xl items-stretch justify-between gap-0.5 px-2 py-1.5">
          <TabLinks tabs={tabs} compact />
        </div>
      </nav>
    </div>
  );
}

export function SectionSwitcher({ items, value, onChange }) {
  return (
    <div className="mb-4 inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-line bg-white p-1">
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition',
            value === id ? 'bg-brand text-ink' : 'text-ink-muted hover:bg-surface hover:text-ink'
          )}
        >
          {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
          {label}
        </button>
      ))}
    </div>
  );
}
