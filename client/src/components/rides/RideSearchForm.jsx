import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { todayISODate } from '../../utils/format';
import { cn } from '../../utils/cn';

const CITY_OPTIONS = [
  'Delhi',
  'Gurugram',
  'Noida',
  'Ghaziabad',
  'Faridabad',
  'Bareilly',
  'Dehradun',
  'Haridwar',
  'Rishikesh',
  'Moradabad',
];

export default function RideSearchForm({
  initial = {},
  className,
  compact = false,
  onSubmit,
}) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    originCity: initial.originCity || '',
    destinationCity: initial.destinationCity || '',
    date: initial.date || todayISODate(),
    passengers: initial.passengers || '1',
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const swap = () => {
    setForm((f) => ({
      ...f,
      originCity: f.destinationCity,
      destinationCity: f.originCity,
    }));
  };

  const submit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams({
      originCity: form.originCity.trim(),
      destinationCity: form.destinationCity.trim(),
      date: form.date,
      passengers: String(form.passengers || 1),
    });
    if (onSubmit) onSubmit(Object.fromEntries(params));
    else navigate(`/search?${params.toString()}`);
  };

  return (
    <form
      onSubmit={submit}
      className={cn(
        'rounded-2xl border border-line bg-white/95 p-4 shadow-sm md:p-5',
        className
      )}
    >
      <div
        className={cn(
          'grid gap-3',
          compact ? 'md:grid-cols-2' : 'md:grid-cols-[1fr_auto_1fr_1fr_auto]'
        )}
      >
        <Select
          label="From"
          name="originCity"
          value={form.originCity}
          onChange={set('originCity')}
          required
          placeholder="Origin city"
          options={CITY_OPTIONS.map((c) => ({ value: c, label: c }))}
        />
        {!compact ? (
          <div className="flex items-end justify-center pb-1">
            <button
              type="button"
              onClick={swap}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-brand hover:bg-brand-soft"
              aria-label="Swap cities"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        <Select
          label="To"
          name="destinationCity"
          value={form.destinationCity}
          onChange={set('destinationCity')}
          required
          placeholder="Destination city"
          options={CITY_OPTIONS.map((c) => ({ value: c, label: c }))}
        />
        <Input
          label="Date"
          type="date"
          name="date"
          value={form.date}
          min={todayISODate()}
          onChange={set('date')}
          required
        />
        <Input
          label="Passengers"
          type="number"
          name="passengers"
          min={1}
          max={8}
          value={form.passengers}
          onChange={set('passengers')}
          required
        />
        {compact ? null : (
          <div className="flex items-end">
            <Button type="submit" className="w-full md:w-auto">
              Search rides
            </Button>
          </div>
        )}
      </div>
      {compact ? (
        <Button type="submit" className="mt-3 w-full">
          Search rides
        </Button>
      ) : null}
    </form>
  );
}
