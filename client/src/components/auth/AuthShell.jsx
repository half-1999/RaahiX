import { cn } from '../../utils/cn';

export default function AuthShell({
  title,
  subtitle,
  illustration,
  darkPanel = false,
  children,
  footer,
}) {
  return (
    <div className="mx-auto grid h-[calc(100dvh-4rem)] max-w-6xl overflow-hidden lg:grid-cols-2">
      <aside
        className={cn(
          'relative hidden min-h-0 overflow-hidden lg:flex lg:flex-col lg:justify-center lg:gap-5 lg:px-8 lg:py-8 xl:px-10',
          darkPanel ? 'bg-[#171717] text-white' : 'bg-surface'
        )}
      >
        <div
          className={cn(
            'pointer-events-none absolute inset-0',
            darkPanel
              ? 'bg-[radial-gradient(ellipse_at_top_left,_rgba(255,212,59,0.18),_transparent_55%)]'
              : 'bg-[radial-gradient(ellipse_at_top,_rgba(255,212,59,0.28),_transparent_60%)]'
          )}
          aria-hidden="true"
        />
        <div className="relative z-10 mx-auto w-full max-w-sm shrink-0 [&>svg]:max-h-[min(42vh,280px)]">
          {illustration}
        </div>
        <div className="relative z-10">
          <p className="font-script text-2xl text-brand xl:text-3xl">Shehar Se Shehar, Saath Safar.</p>
          <p
            className={cn(
              'mt-1.5 max-w-sm text-sm leading-relaxed',
              darkPanel ? 'text-white/70' : 'text-ink/70'
            )}
          >
            Scheduled intercity shared rides you can plan around.
          </p>
        </div>
      </aside>

      <section className="flex min-h-0 flex-col justify-center overflow-hidden px-4 py-4 sm:px-8 lg:px-10">
        <div className="mx-auto flex w-full max-w-md flex-col">
          <h1 className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            {title}
          </h1>
          {subtitle ? <p className="mt-1 text-sm leading-snug text-slate">{subtitle}</p> : null}
          <div className="mt-3">{children}</div>
          {footer ? <div className="mt-3">{footer}</div> : null}
        </div>
      </section>
    </div>
  );
}
