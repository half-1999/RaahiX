import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import {
  getInstallInstructions,
  getInstallState,
  promptInstall,
  subscribeInstall,
} from '../../pwa/installManager';

export default function DownloadAppButton() {
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

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="max-[360px]:!px-2 shrink-0 whitespace-nowrap"
        loading={busy}
        onClick={onDownload}
        aria-label="Download App"
        aria-haspopup={installState.canPrompt ? undefined : 'dialog'}
        data-download-app
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Download App</span>
      </Button>
      {createPortal(
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
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-navy">
                {help.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </>
          ) : null}
        </Modal>,
        document.body
      )}
    </>
  );
}
