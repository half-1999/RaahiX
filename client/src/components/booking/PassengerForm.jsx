import Input from '../ui/Input';
import Button from '../ui/Button';

export default function PassengerForm({ seats = [], passengers = [], onChange, onSubmit, loading }) {
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
      {seats.map((seatNumber, index) => {
        const p = passengers[index] || { seatNumber, name: '', phone: '', age: '' };
        return (
          <fieldset key={seatNumber} className="rounded-xl border border-line bg-white p-4">
            <legend className="px-1 text-sm font-medium text-brand">Seat {seatNumber}</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                label="Passenger name"
                required
                value={p.name || ''}
                onChange={(e) => update(index, 'name', e.target.value)}
              />
              <Input
                label="Phone"
                required
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
