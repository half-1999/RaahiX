import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, CalendarDays, MapPin, Users } from 'lucide-react';
import { api } from '../../services/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { todayISODate } from '../../utils/format';
import { cn } from '../../utils/cn';

export default function RideSearchForm({
  initial = {},
  className,
  compact = false,
  floating = false,
  onSubmit,
}) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const citiesQuery = useQuery({
    queryKey: ['locations', 'cities'],
    queryFn: () => api.get('/locations').then((response) => response.data.data),
  });
  const cities = citiesQuery.data?.cities || [];
  const [form, setForm] = useState({
    originCity: initial.originCity || '',
    destinationCity: initial.destinationCity || '',
    date: initial.date || todayISODate(),
    passengers: initial.passengers || '1',
  });

  useEffect(() => {
    if (!cities.length || initial.originCity || initial.destinationCity) return;
    setForm((current) => {
      if (current.originCity || current.destinationCity) return current;
      const origin = cities.includes('Delhi') ? 'Delhi' : cities[0];
      const destination = cities.includes('Bareilly') && cities.includes('Bareilly') && 'Bareilly' !== origin
        ? 'Bareilly'
        : cities.find((city) => city !== origin) || '';
      return { ...current, originCity: origin, destinationCity: destination };
    });
  }, [cities, initial.originCity, initial.destinationCity]);

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
    if (!form.originCity || !form.destinationCity) {
      setError('Choose a pickup and a drop from the location list.');
      return;
    }
    if (form.originCity === form.destinationCity) {
      setError('Pickup and drop must be different cities.');
      return;
    }
    if (!form.date || Number(form.passengers) < 1) {
      setError('Choose a valid date and passenger count.');
      return;
    }
    setError('');
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
        'rounded-2xl border border-line bg-white/95 p-4 shadow-[var(--shadow-soft)] backdrop-blur md:p-5',
        floating && '-mt-10 border-white/70 shadow-[var(--shadow-lift)] md:-mt-14',
        className
      )}
    >
      <div
        className={cn(
          'grid gap-3',
          compact
            ? 'md:grid-cols-2'
            : 'md:grid-cols-[1.1fr_auto_1.1fr_1fr_0.7fr_auto]'
        )}
      >
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-[2.55rem] h-4 w-4 text-brand" />
          <Select
            label="From"
            name="originCity"
            value={form.originCity}
            onChange={set('originCity')}
            required
            placeholder="Origin city"
            options={cities.map((city) => ({ value: city, label: city }))}
            className="pl-9"
          />
        </div>
        {!compact ? (
          <div className="flex items-end justify-center pb-1">
            <button
              type="button"
              onClick={swap}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-mist text-brand transition hover:border-brand hover:bg-brand hover:text-white"
              aria-label="Swap cities"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-[2.55rem] h-4 w-4 text-coral" />
          <Select
            label="To"
            name="destinationCity"
            value={form.destinationCity}
            onChange={set('destinationCity')}
            required
            placeholder="Destination city"
            options={cities.map((city) => ({ value: city, label: city }))}
            className="pl-9"
          />
        </div>
        <div className="relative">
          <CalendarDays className="pointer-events-none absolute left-3 top-[2.55rem] h-4 w-4 text-slate" />
          <Input
            label="Travel date"
            type="date"
            name="date"
            value={form.date}
            min={todayISODate()}
            onChange={set('date')}
            required
            inputClassName="pl-9"
          />
        </div>
        <div className="relative">
          <Users className="pointer-events-none absolute left-3 top-[2.55rem] h-4 w-4 text-slate" />
          <Input
            label="Passengers"
            type="number"
            name="passengers"
            min={1}
            max={6}
            value={form.passengers}
            onChange={set('passengers')}
            required
            inputClassName="pl-9"
          />
        </div>
        {compact ? null : (
          <div className="flex items-end">
            <Button type="submit" className="w-full md:min-w-[8.5rem]">
              Find rides
            </Button>
          </div>
        )}
      </div>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      {compact ? (
        <Button type="submit" className="mt-3 w-full">
          Search cabs
        </Button>
      ) : null}
    </form>
  );
}
