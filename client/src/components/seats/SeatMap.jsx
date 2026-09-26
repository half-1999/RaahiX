import { cn } from '../../utils/cn';

const statusStyles = {
  AVAILABLE: 'border-brand bg-brand-soft text-brand-dark hover:bg-brand hover:text-white cursor-pointer',
  SELECTED: 'border-accent bg-accent text-white cursor-pointer ring-2 ring-accent/30',
  HELD: 'border-line bg-surface-2 text-ink-muted cursor-not-allowed opacity-70',
  BOOKED: 'border-line bg-ink/10 text-ink-muted cursor-not-allowed',
  BLOCKED: 'border-line bg-ink/15 text-ink-muted cursor-not-allowed line-through',
};

export default function SeatMap({
  seats = [],
  selected = [],
  onToggle,
  maxSelectable,
  disabled = false,
}) {
  if (!seats.length) {
    return (
      <p className="rounded-lg border border-dashed border-line bg-white p-6 text-sm text-ink-muted">
        Seat map unavailable for this ride.
      </p>
    );
  }

  const rows = [...new Set(seats.map((s) => s.row ?? 0))].sort((a, b) => a - b);
  const byRow = rows.map((row) =>
    seats
      .filter((s) => (s.row ?? 0) === row)
      .sort((a, b) => String(a.position || a.seatNumber).localeCompare(String(b.position || b.seatNumber)))
  );

  const selectedSet = new Set(selected);

  return (
    <div className="space-y-3">
      <div className="mx-auto w-full max-w-md rounded-xl border border-line bg-white p-4">
        <div className="mb-4 rounded-md bg-surface-2 px-3 py-2 text-center text-xs font-medium tracking-wide text-ink-muted">
          DRIVER
        </div>
        <div className="space-y-3">
          {byRow.map((rowSeats, idx) => (
            <div key={rows[idx]} className="flex flex-wrap justify-center gap-2">
              {rowSeats.map((seat) => {
                const isSelected = selectedSet.has(seat.seatNumber);
                const status = isSelected ? 'SELECTED' : seat.status;
                const canSelect =
                  !disabled &&
                  (seat.status === 'AVAILABLE' || isSelected) &&
                  (!maxSelectable || isSelected || selected.length < maxSelectable);

                return (
                  <button
                    key={seat.seatNumber}
                    type="button"
                    disabled={!canSelect && !isSelected}
                    onClick={() => onToggle?.(seat.seatNumber)}
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-lg border text-xs font-semibold transition',
                      statusStyles[status] || statusStyles.BLOCKED,
                      !canSelect && !isSelected && 'opacity-60'
                    )}
                    title={`${seat.seatNumber} · ${seat.status}`}
                  >
                    {seat.seatNumber}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
