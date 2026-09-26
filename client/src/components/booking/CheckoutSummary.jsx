import { formatCurrency } from '../../utils/format';

export default function CheckoutSummary({ booking, ride }) {
  if (!booking) return null;
  const amount = booking.totalAmount;
  const perSeat = booking.amountPerSeat;
  const seats = booking.selectedSeats || booking.passengers?.map((p) => p.seatNumber) || [];

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <h3 className="font-display text-lg text-ink">Fare summary</h3>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">Seats</dt>
          <dd className="font-medium">{seats.join(', ') || '—'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">Passengers</dt>
          <dd className="font-medium">{booking.passengerCount || seats.length}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">Per seat</dt>
          <dd className="font-medium">{formatCurrency(perSeat)}</dd>
        </div>
        {ride?.pickupPoint ? (
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Pickup</dt>
            <dd className="text-right font-medium">{ride.pickupPoint}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4 border-t border-line pt-2 text-base">
          <dt className="font-medium">Total</dt>
          <dd className="font-display text-brand">{formatCurrency(amount)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-ink-muted">
        Amount is calculated by the server and cannot be edited here.
      </p>
    </div>
  );
}
