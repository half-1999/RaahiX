import { formatCurrency } from '../../utils/format';
import { ShieldCheck } from 'lucide-react';

export default function CheckoutSummary({ booking, ride }) {
  if (!booking) return null;
  const amount = Number(booking.totalAmount) || 0;
  const perSeat = Number(booking.amountPerSeat) || 0;
  const seats = booking.selectedSeats || booking.passengers?.map((p) => p.seatNumber) || [];
  const seatCount = seats.length || booking.passengerCount || 1;
  const seatFare = perSeat * seatCount;
  const extras = Math.max(0, amount - seatFare);

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
      <h3 className="font-display text-lg font-bold text-navy">Fare summary</h3>
      <dl className="mt-4 space-y-2.5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate">
            Seat fare{seats.length ? ` (${seats.join(', ')})` : ''}
          </dt>
          <dd className="font-semibold text-navy">{formatCurrency(seatFare || amount)}</dd>
        </div>
        {extras > 0 ? (
          <div className="flex justify-between gap-4">
            <dt className="text-slate">Fees &amp; taxes</dt>
            <dd className="font-semibold text-navy">{formatCurrency(extras)}</dd>
          </div>
        ) : (
          <>
            <div className="flex justify-between gap-4">
              <dt className="text-slate">Service fee</dt>
              <dd className="font-semibold text-navy">{formatCurrency(0)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate">Taxes</dt>
              <dd className="font-semibold text-navy">{formatCurrency(0)}</dd>
            </div>
          </>
        )}
        <div className="flex justify-between gap-4 border-t border-line pt-3">
          <dt className="text-base font-semibold text-navy">Total</dt>
          <dd className="font-display text-3xl font-bold text-brand-dark">{formatCurrency(amount)}</dd>
        </div>
      </dl>
      <div className="mt-4 space-y-2 rounded-xl bg-mist/80 p-3 text-xs text-slate">
        <p className="inline-flex items-center gap-1.5 font-semibold text-navy">
          <ShieldCheck className="h-3.5 w-3.5 text-brand-dark" />
          Secure payment
        </p>
        <p>Cancellation and refunds follow the corridor policy on your ticket.</p>
        {ride?.pickupPoint ? <p>Pickup: {ride.pickupPoint}</p> : null}
      </div>
    </div>
  );
}
