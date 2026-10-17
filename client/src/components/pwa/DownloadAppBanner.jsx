import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Smartphone } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import {
  getInstallInstructions,
  getInstallState,
  promptInstall,
  subscribeInstall,
} from '../../pwa/installManager';
import { cn } from '../../utils/cn';

export default function DownloadAppBanner({ className, compact = false }) {
  const [installState, setInstallState] = useState(getInstallState);
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(null);

  useEffect(() => subscribeInstall(setInstallState), []);

  if (installState.installed) return null;

  const onDownload = async () => {
    if (getInstallState().canPrompt) {
      setBusy(true);
      const result = await promptInstall();
      setBusy(false);
      if (result.outcome === 'unavailable') setHelp(getInstallInstructions());
      return;
    }
    setHelp(getInstallInstructions());
  };

  const action = (
    <Button
      size={compact ? 'md' : 'lg'}
      loading={busy}
      onClick={onDownload}
      aria-label="Download App"
      aria-haspopup={installState.canPrompt ? undefined : 'dialog'}
      data-download-app
      className={compact ? 'w-full sm:w-auto' : 'w-full shrink-0 sm:w-auto'}
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      Download App
    </Button>
  );

  const helpModal = createPortal(
    <Modal
      open={Boolean(help)}
      onClose={() => setHelp(null)}
      title={help?.title || 'Install RaahiX'}
      size="sm"
      footer={
        <Button variant="outline" size="sm" onClick={() => setHelp(null)}>
          Close
        </Button>
      }
    >
      {help ? (
        <>
          <p className="text-sm text-slate">{help.intro}</p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-ink">
            {help.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </>
      ) : null}
    </Modal>,
    document.body
  );

  if (compact) {
    return (
      <>
        <div className={cn('space-y-3', className)}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">Get the app</p>
          <p className="text-sm leading-relaxed text-slate">
            Install RaahiX on your phone for faster search and booking.
          </p>
          {action}
        </div>
        {helpModal}
      </>
    );
  }

  return (
    <>
      <section
        id="download-app"
        className={cn(
          'rx-ink-band scroll-mt-24 overflow-hidden rounded-[1.75rem] border border-brand/35 shadow-[var(--shadow-lift)]',
          className
        )}
        aria-labelledby="download-app-heading"
      >
        <div className="grid items-center gap-8 px-6 py-10 sm:px-8 md:grid-cols-[1.2fr_auto] md:gap-10 md:py-12 lg:px-10">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
              <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
              Install RaahiX
            </p>
            <h2 id="download-app-heading" className="mt-4 font-display text-2xl font-semibold text-white md:text-3xl">
              Download the app
            </h2>
            <p className="rx-ink-band-muted mt-3 max-w-[46ch] text-sm leading-relaxed">
              Keep scheduled rides, seat picks, and bookings in one place. Add RaahiX to your home screen for a faster
              phone experience.
            </p>
            <p className="mt-3 font-script text-2xl text-brand">Shehar Se Shehar, Saath Safar.</p>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:items-start md:items-end">
            {action}
            <p className="rx-ink-band-soft text-xs">Works as a progressive web app on supported phones and desktops.</p>
          </div>
        </div>
      </section>
      {helpModal}
    </>
  );
}
