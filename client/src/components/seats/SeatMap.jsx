import { cn } from '../../utils/cn';
import { seatMeta } from '../../utils/ridePresentation';
import { normalizeVehicleType, VEHICLE_TYPES } from '../../utils/vehicleLayouts';

const statusStyles = {
  AVAILABLE:
    'border-brand/40 bg-indigo-soft text-navy hover:border-brand hover:bg-brand hover:text-white cursor-pointer',
  SELECTED: 'border-coral bg-coral text-white cursor-pointer ring-2 ring-coral/30 seat-selected-anim',
  HELD: 'border-line bg-mist text-slate cursor-not-allowed opacity-70',
  BOOKED: 'border-line bg-navy/10 text-slate cursor-not-allowed',
  BLOCKED: 'border-line bg-navy/15 text-slate cursor-not-allowed line-through',
  PREMIUM:
    'border-coral/50 bg-coral-soft text-navy hover:bg-coral hover:text-white cursor-pointer',
};

function seatByNumber(seats, number) {
  return seats.find((s) => s.seatNumber === number);
}

function CabinSeat({
  seat,
  selectedSet,
  selected,
  onToggle,
  onHover,
  maxSelectable,
  disabled,
}) {
  if (!seat) {
    return <div className="h-12 w-12 md:h-14 md:w-14" aria-hidden />;
  }

  const isSelected = selectedSet.has(seat.seatNumber);
  const meta = seatMeta(seat.seatNumber, seat.position);
  const baseStatus =
    seat.status === 'AVAILABLE' && meta.premium && !isSelected ? 'PREMIUM' : seat.status;
  const status = isSelected ? 'SELECTED' : baseStatus;
  const canSelect =
    !disabled &&
    (seat.status === 'AVAILABLE' || isSelected) &&
    (!maxSelectable || isSelected || selected.length < maxSelectable);

  return (
    <button
      type="button"
      disabled={!canSelect && !isSelected}
      onClick={() => onToggle?.(seat.seatNumber)}
      onMouseEnter={() => onHover?.(seat)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(seat)}
      className={cn(
        'relative flex h-12 w-12 flex-col items-center justify-center rounded-xl border text-xs font-bold transition duration-200 md:h-14 md:w-14',
        statusStyles[status] || statusStyles.BLOCKED,
        !canSelect && !isSelected && 'opacity-60'
      )}
      title={`${seat.seatNumber} · ${meta.label} · ${seat.status}`}
      aria-pressed={isSelected}
      aria-label={`Seat ${seat.seatNumber}, ${meta.label}, ${seat.status}`}
    >
      <span>{seat.seatNumber}</span>
      {meta.window ? (
        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-brand" />
      ) : null}
    </button>
  );
}

function DriverSeat() {
  return (
    <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl border border-navy/30 bg-navy text-[10px] font-bold uppercase tracking-wide text-white/90 md:h-14 md:w-14">
      DRV
    </div>
  );
}

export default function SeatMap({
  seats = [],
  selected = [],
  onToggle,
  onHover,
  maxSelectable,
  disabled = false,
  vehicleType,
}) {
  if (!seats.length) {
    return (
      <p className="rounded-2xl border border-dashed border-line bg-white p-6 text-sm text-slate">
        Seat map unavailable for this ride.
      </p>
    );
  }

  const type = normalizeVehicleType(vehicleType || (seats.length >= 6 ? '6_SEATER' : '5_SEATER'));
  const selectedSet = new Set(selected);
  const seatProps = { selectedSet, selected, onToggle, onHover, maxSelectable, disabled };

  const a1 = seatByNumber(seats, 'A1');
  const b1 = seatByNumber(seats, 'B1');
  const b2 = seatByNumber(seats, 'B2');
  const b3 = seatByNumber(seats, 'B3');
  const c1 = seatByNumber(seats, 'C1');
  const c2 = seatByNumber(seats, 'C2');
  const c3 = seatByNumber(seats, 'C3');

  const hasNamedLayout = Boolean(a1 || b1 || b2 || b3 || c1);

  if (!hasNamedLayout) {
    const rows = [...new Set(seats.map((s) => s.row ?? 0))].sort((a, b) => a - b);
    const byRow = rows.map((row) =>
      seats
        .filter((s) => (s.row ?? 0) === row)
        .sort((a, b) =>
          String(a.position || a.seatNumber).localeCompare(String(b.position || b.seatNumber))
        )
    );

    return (
      <div className="mx-auto w-full max-w-md rounded-[1.75rem] border border-line bg-gradient-to-b from-white to-mist/50 p-4 shadow-[var(--shadow-soft)] md:max-w-lg md:p-6">
        <div className="mb-4 rounded-xl bg-navy px-3 py-2 text-center text-xs font-semibold tracking-[0.18em] text-white/80">
          DRIVER
        </div>
        <div className="space-y-3">
          {byRow.map((rowSeats, idx) => (
            <div key={rows[idx]} className="flex flex-wrap justify-center gap-3">
              {rowSeats.map((seat) => (
                <CabinSeat key={seat.seatNumber} seat={seat} {...seatProps} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="mx-auto w-full max-w-sm rounded-[2rem] border-2 border-navy/15 bg-gradient-to-b from-[#eef2f8] via-white to-[#e8edf5] p-4 shadow-[var(--shadow-soft)] md:max-w-md md:p-6">
        <div className="mb-4 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate">
            {type === VEHICLE_TYPES.SIX_SEATER
              ? 'SUV · 7 including driver · 6 bookable'
              : 'Sedan · 5 including driver · 4 bookable'}
          </p>
        </div>

        {/* Front row: driver + co-passenger */}
        <div className="mb-4 grid grid-cols-3 items-center gap-3 px-2">
          <DriverSeat />
          <div className="flex justify-center">
            <div className="h-8 w-px bg-line" aria-hidden />
          </div>
          <div className="flex justify-end">
            <CabinSeat seat={a1} {...seatProps} />
          </div>
        </div>

        <div className="mx-4 mb-4 border-t border-dashed border-line" />

        {/* Middle row */}
        <div className="mb-4 flex items-center justify-center gap-3">
          <CabinSeat seat={b1} {...seatProps} />
          <CabinSeat seat={b2} {...seatProps} />
          <CabinSeat seat={b3} {...seatProps} />
        </div>

        {type === VEHICLE_TYPES.SIX_SEATER ? (
          <div className="flex items-center justify-center gap-3">
            <CabinSeat seat={c1} {...seatProps} />
            <CabinSeat seat={c2} {...seatProps} />
          </div>
        ) : null}

        <p className="mt-5 text-center text-[11px] font-medium uppercase tracking-wide text-slate">
          Rear of cabin
        </p>
      </div>
    </div>
  );
}
