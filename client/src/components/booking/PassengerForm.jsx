import { useEffect } from 'react';
import { UserRound } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { seatMeta } from '../../utils/ridePresentation';
import { useAuth } from '../../context/AuthContext';

export default function PassengerForm({
  seats = [],
  passengers = [],
  onChange,
  onSubmit,
  loading,
}) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !seats.length || !onChange) return;
    const needsPrefill = passengers.some((p) => !p?.name && !p?.phone);
    if (!needsPrefill && passengers.length === seats.length) return;

    onChange(
      seats.map((seat, index) => {
        const seatNumber = typeof seat === 'string' ? seat : seat?.seatNumber;
        const existing = passengers[index] || {};
        return {
          seatNumber,
          name: existing.name || (index === 0 ? user.name || '' : ''),
          phone: existing.phone || (index === 0 ? user.phone || '' : ''),
          age: existing.age || (index === 0 ? user.age || '' : ''),
          email: existing.email || (index === 0 ? user.email || '' : ''),
        };
      })
    );
    // Prefill once when seats/user become available
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seats.join('|'), user?.id, user?.email, user?.age]);

  const update = (index, field, value) => {
    const next = passengers.map((p, i) => (i === index ? { ...p, [field]: value } : p));
    onChange?.(next);
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(passengers);
      }}
    >
      <div className="rounded-2xl border border-line bg-mist/50 p-4">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-navy">
          <UserRound className="h-4 w-4 text-brand" />
          Passenger details
        </p>
        <p className="mt-1 text-xs text-slate">
          Enter one passenger per selected seat. We&apos;ll use this on your ticket.
        </p>
      </div>

      {seats.map((seat, index) => {
        const seatNumber = typeof seat === 'string' ? seat : seat?.seatNumber;
        const meta = seatMeta(seatNumber);
        const p = passengers[index] || {
          seatNumber,
          name: '',
          phone: '',
          age: '',
          email: '',
        };
        return (
          <fieldset
            key={seatNumber || index}
            className="rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-soft)] md:p-5"
          >
            <legend className="px-1">
              <span className="text-sm font-semibold text-brand">Seat {seatNumber}</span>
              <span className="ml-2 text-xs font-medium text-slate">{meta.label}</span>
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Full name"
                required
                autoComplete="name"
                value={p.name || ''}
                onChange={(e) => update(index, 'name', e.target.value)}
                className="sm:col-span-2"
              />
              <Input
                label="Phone"
                type="tel"
                required
                autoComplete="tel"
                value={p.phone || ''}
                onChange={(e) => update(index, 'phone', e.target.value)}
              />
              <Input
                label="Age"
                type="number"
                min={1}
                max={120}
                required
                value={p.age || ''}
                onChange={(e) => update(index, 'age', e.target.value)}
              />
              <Input
                label="Email (optional)"
                type="email"
                autoComplete="email"
                value={p.email || ''}
                onChange={(e) => update(index, 'email', e.target.value)}
                className="sm:col-span-2"
                hint="For ticket copy — not required to continue"
              />
            </div>
          </fieldset>
        );
      })}
      <Button type="submit" loading={loading} className="w-full sm:w-auto">
        Continue to checkout
      </Button>
    </form>
  );
}
