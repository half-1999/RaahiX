import { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

const POSITIONS = ['L', 'M', 'R', 'WL', 'WR'];

/** Interactive builder for vehicle.seatConfiguration */
export default function SeatConfigBuilder({ value = [], onChange }) {
  const [row, setRow] = useState(1);
  const [seatNumber, setSeatNumber] = useState('');
  const [position, setPosition] = useState('L');

  const add = () => {
    if (!seatNumber.trim()) return;
    const next = [
      ...value,
      { seatNumber: seatNumber.trim().toUpperCase(), row: Number(row) || 1, position },
    ];
    onChange?.(next);
    setSeatNumber('');
  };

  const remove = (idx) => onChange?.(value.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3 rounded-lg border border-line bg-surface/50 p-3">
      <p className="text-sm font-medium text-ink">Seat configuration</p>
      <div className="grid gap-2 sm:grid-cols-4">
        <Input label="Seat #" value={seatNumber} onChange={(e) => setSeatNumber(e.target.value)} placeholder="A1" />
        <Input label="Row" type="number" min={1} value={row} onChange={(e) => setRow(e.target.value)} />
        <Select
          label="Position"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          options={POSITIONS.map((p) => ({ value: p, label: p }))}
        />
        <div className="flex items-end">
          <Button type="button" variant="secondary" className="w-full" onClick={add}>
            Add seat
          </Button>
        </div>
      </div>
      {value.length ? (
        <ul className="flex flex-wrap gap-2">
          {value.map((s, idx) => (
            <li
              key={`${s.seatNumber}-${idx}`}
              className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs border border-line"
            >
              {s.seatNumber} (r{s.row}/{s.position})
              <button type="button" className="text-danger" onClick={() => remove(idx)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-ink-muted">Add seats to match vehicle capacity.</p>
      )}
      <p className="text-xs text-ink-muted">Capacity will be set to {value.length} seats.</p>
    </div>
  );
}
