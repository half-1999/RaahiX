import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal, Pencil } from 'lucide-react';
import { driverService } from '../../services/driverService';
import { getErrorMessage } from '../../services/api';
import StatusBadge from '../common/StatusBadge';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import ConfirmDialog from '../ui/ConfirmDialog';
import Modal from '../ui/Modal';
import { cityLabel, entityId, formatCurrency, formatDate, formatTime } from '../../utils/format';
import { isRideEditable, isRideReadOnly } from '../../utils/rideStatus';
import { cn } from '../../utils/cn';

function toLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Shared ride row for driver Rides + Trips lists.
 * Edit opens via pencil icon → modal (not a permanent Edit button).
 */
export default function DriverRideListItem({
  ride,
  detailBase = '/driver/trips',
  onCancel,
}) {
  const queryClient = useQueryClient();
  const id = entityId(ride);
  const readOnly = isRideReadOnly(ride.status);
  const canEdit = isRideEditable(ride.status);
  const canCancel = !readOnly && ride.status !== 'STARTED';

  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [editError, setEditError] = useState('');
  const [form, setForm] = useState({
    departureTime: toLocalInput(ride.departureTime),
    arrivalTime: toLocalInput(ride.arrivalTime),
    pickupPoint: ride.pickupPoint || '',
    dropPoint: ride.dropPoint || '',
    pricePerSeat: ride.pricePerSeat != null ? String(ride.pricePerSeat) : '',
  });

  const saveEdit = useMutation({
    mutationFn: () =>
      driverService.updateRide(id, {
        departureTime: new Date(form.departureTime).toISOString(),
        arrivalTime: new Date(form.arrivalTime).toISOString(),
        pickupPoint: form.pickupPoint,
        dropPoint: form.dropPoint,
        pricePerSeat: Number(form.pricePerSeat),
      }),
    onSuccess: () => {
      setEditError('');
      setEditOpen(false);
      setMenuOpen(false);
      queryClient.invalidateQueries({ queryKey: ['driver', 'rides'] });
      queryClient.invalidateQueries({ queryKey: ['driver', 'dashboard'] });
    },
    onError: (err) => setEditError(getErrorMessage(err)),
  });

  function openEdit() {
    setForm({
      departureTime: toLocalInput(ride.departureTime),
      arrivalTime: toLocalInput(ride.arrivalTime),
      pickupPoint: ride.pickupPoint || '',
      dropPoint: ride.dropPoint || '',
      pricePerSeat: ride.pricePerSeat != null ? String(ride.pricePerSeat) : '',
    });
    setEditError('');
    setEditOpen(true);
    setMenuOpen(false);
  }

  const detailTo = `${detailBase}/${id}`;

  return (
    <li
      className={cn(
        'rounded-2xl border-2 border-ink/10 bg-white p-4 shadow-[var(--shadow-soft)] transition',
        readOnly && 'opacity-60'
      )}
      aria-disabled={readOnly || undefined}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <Link
          to={detailTo}
          className={cn('min-w-0 flex-1', readOnly && 'cursor-default')}
        >
          <p className="font-display text-[clamp(1rem,1.2vw+0.5rem,1.25rem)] font-bold text-ink">
            {cityLabel(ride.routeId?.origin)} → {cityLabel(ride.routeId?.destination)}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {formatDate(ride.date || ride.departureTime)} · {formatTime(ride.departureTime)}
            {ride.arrivalTime ? ` → ${formatTime(ride.arrivalTime)}` : ''}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            <span className="font-mono">{String(id).slice(-8)}</span>
            {' · '}
            {ride.vehicleId?.registrationNumber || '—'}
            {' · '}
            {formatCurrency(ride.pricePerSeat)}/seat
            {ride.availableSeats != null && ride.status !== 'COMPLETED'
              ? ` · ${ride.availableSeats} seats left`
              : ''}
          </p>
          {ride.status === 'COMPLETED' && ride.finance ? (
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 rounded-xl bg-surface px-3 py-2 text-xs sm:grid-cols-4">
              <div>
                <dt className="text-ink-muted">Gross fare</dt>
                <dd className="font-bold text-ink">{formatCurrency(ride.finance.grossFare)}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Collected</dt>
                <dd className="font-bold text-ink">{formatCurrency(ride.finance.collected)}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Outstanding</dt>
                <dd className="font-bold text-ink">{formatCurrency(ride.finance.outstanding)}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Net collected</dt>
                <dd className="font-bold text-ink">
                  {formatCurrency(ride.finance.netCollected)}
                  {ride.finance.refunded ? (
                    <span className="ml-1 font-medium text-ink-muted">
                      (−{formatCurrency(ride.finance.refunded)} refunded)
                    </span>
                  ) : null}
                </dd>
              </div>
              <div className="col-span-2 sm:col-span-4">
                <dt className="sr-only">Passengers</dt>
                <dd className="text-ink-muted">
                  {ride.finance.passengerCount} passenger(s)
                  {ride.actualCompletedAt
                    ? ` · completed ${formatDate(ride.actualCompletedAt)} ${formatTime(ride.actualCompletedAt)}`
                    : ''}
                </dd>
              </div>
            </dl>
          ) : null}
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={ride.status} type="ride" />
          {!readOnly ? (
            <div className="relative">
              <Button
                size="sm"
                variant="outline"
                className="!px-2"
                aria-label="Ride actions"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
              {menuOpen ? (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-10 cursor-default"
                    aria-label="Close menu"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div
                    role="menu"
                    className="absolute right-0 z-20 mt-1 min-w-[10rem] rounded-xl border border-line bg-white py-1 shadow-[var(--shadow-lift)]"
                  >
                    {canEdit ? (
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-ink hover:bg-surface"
                        onClick={openEdit}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        Edit ride
                      </button>
                    ) : null}
                    <Link
                      to={detailTo}
                      role="menuitem"
                      className="block px-3 py-2 text-sm font-semibold text-ink hover:bg-surface"
                      onClick={() => setMenuOpen(false)}
                    >
                      View details
                    </Link>
                    {canCancel ? (
                      <button
                        type="button"
                        role="menuitem"
                        className="w-full px-3 py-2 text-left text-sm font-semibold text-danger hover:bg-danger/10"
                        onClick={() => {
                          setMenuOpen(false);
                          setConfirmCancel(true);
                        }}
                      >
                        Void ride
                      </button>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <Link to={detailTo}>
              <Button size="sm" variant="ghost">
                View
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Modal
        open={editOpen}
        onClose={() => !saveEdit.isPending && setEditOpen(false)}
        title="Edit ride"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saveEdit.isPending}>
              Cancel
            </Button>
            <Button
              loading={saveEdit.isPending}
              onClick={() => {
                if (new Date(form.arrivalTime) <= new Date(form.departureTime)) {
                  setEditError('Arrival must be after departure');
                  return;
                }
                saveEdit.mutate();
              }}
            >
              Save changes
            </Button>
          </>
        }
      >
        {editError ? <Alert tone="error" className="mb-3">{editError}</Alert> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ink">
            Departure
            <input
              required
              type="datetime-local"
              className="mt-1 h-11 w-full rounded-xl border border-line px-3"
              value={form.departureTime}
              onChange={(e) => setForm((f) => ({ ...f, departureTime: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Arrival
            <input
              required
              type="datetime-local"
              className="mt-1 h-11 w-full rounded-xl border border-line px-3"
              value={form.arrivalTime}
              onChange={(e) => setForm((f) => ({ ...f, arrivalTime: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Pickup
            <input
              required
              className="mt-1 h-11 w-full rounded-xl border border-line px-3"
              value={form.pickupPoint}
              onChange={(e) => setForm((f) => ({ ...f, pickupPoint: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Drop
            <input
              required
              className="mt-1 h-11 w-full rounded-xl border border-line px-3"
              value={form.dropPoint}
              onChange={(e) => setForm((f) => ({ ...f, dropPoint: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium text-ink sm:col-span-2">
            Price per seat
            <input
              required
              type="number"
              min="1"
              className="mt-1 h-11 w-full rounded-xl border border-line px-3 sm:max-w-xs"
              value={form.pricePerSeat}
              onChange={(e) => setForm((f) => ({ ...f, pricePerSeat: e.target.value }))}
            />
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Void this ride?"
        description="The ride stays in history as voided (not a fourth status). Confirmed bookings may need refunds."
        confirmLabel="Void ride"
        onConfirm={() => {
          setConfirmCancel(false);
          onCancel?.(id);
        }}
      />
    </li>
  );
}
