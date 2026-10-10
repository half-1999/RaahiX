import { useEffect, useState } from 'react';
import { bookingService } from '../../services/bookingService';

export default function PaymentProofPreview({ bookingId, status }) {
  const [url, setUrl] = useState('');
  const [open, setOpen] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    bookingService
      .proofUrl(bookingId)
      .then((next) => {
        objectUrl = next;
        if (active) setUrl(next);
      })
      .catch(() => {
        if (active) setMissing(true);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [bookingId]);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate">Payment proof · {status || 'Submitted'}</p>
      {missing ? <p className="mt-2 text-sm text-slate">Screenshot is not stored for this booking.</p> : null}
      {url ? (
        <button type="button" className="mt-2 block" onClick={() => setOpen(true)} aria-label="Open payment screenshot">
          <img src={url} alt="Payment screenshot" className="h-36 w-full max-w-xs rounded-xl object-cover" />
        </button>
      ) : null}
      {open && url ? (
        <button
          type="button"
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/80 p-4"
          onClick={() => setOpen(false)}
          aria-label="Close payment screenshot"
        >
          <img src={url} alt="Payment screenshot enlarged" className="max-h-[85dvh] max-w-full rounded-xl" />
        </button>
      ) : null}
    </div>
  );
}
