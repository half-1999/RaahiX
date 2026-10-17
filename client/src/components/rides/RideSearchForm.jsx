import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, CalendarDays, MapPin, MapPinned, Search, Users } from 'lucide-react';
import { api } from '../../services/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { todayISODate } from '../../utils/format';
import { cn } from '../../utils/cn';

const fieldControl =
  'h-10 border-0 bg-transparent px-0 shadow-none focus:border-transparent focus:ring-0 disabled:bg-transparent';

function SwapButton({ onClick, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-mist text-ink transition hover:border-brand hover:bg-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark',
        className
      )}
      aria-label="Swap origin and destination"
    >
      <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

function FindRideLabel({ label }) {
  return (
    <>
      <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </>
  );
}

export default function RideSearchForm({
  initial = {},
  className,
  compact = false,
  floating = false,
  onSubmit,
  submitLabel,
  actionBelow = false,
  bare = false,
  hero = false,
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
      const destination =
        cities.includes('Bareilly') && 'Bareilly' !== origin
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

  const findLabel = submitLabel || (hero ? 'Find Ride' : compact ? 'Search cars' : 'Find rides');
  const status = (
    <>
      {citiesQuery.isLoading ? <p className="mt-3 text-sm text-slate">Loading cities…</p> : null}
      {citiesQuery.isError ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          Cities could not be loaded. Refresh and try again.
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );

  if (hero) {
    return (
      <form onSubmit={submit} className={cn('w-full min-w-0', className)}>
        <div className="rx-hero-search-shell rounded-[1.75rem] border border-brand/40 bg-brand-soft p-3 shadow-[var(--shadow-soft)] sm:p-4 md:p-5">
          <div className="rx-hero-search overflow-hidden rounded-2xl border border-brand/25 bg-white shadow-[var(--shadow-lift)]">
            <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1.2fr)_auto_minmax(0,1.2fr)_minmax(11.25rem,1fr)_minmax(5.5rem,0.5fr)_auto] lg:items-end">
              <div className="relative min-w-0 px-4 py-3">
                <MapPin className="pointer-events-none absolute left-4 top-[2.65rem] h-4 w-4 text-brand-ink" aria-hidden="true" />
                <Select
                  label="From"
                  name="originCity"
                  value={form.originCity}
                  onChange={set('originCity')}
                  required
                  placeholder="Origin city"
                  options={cities.map((city) => ({ value: city, label: city }))}
                  className={cn(fieldControl, 'pl-7')}
                />
              </div>

              <div className="flex items-center justify-center border-t border-line px-2 py-2 lg:border-t-0 lg:border-l lg:py-3 lg:pb-3.5">
                <SwapButton onClick={swap} />
              </div>

              <div className="relative min-w-0 border-t border-line px-4 py-3 lg:border-t-0 lg:border-l">
                <MapPinned className="pointer-events-none absolute left-4 top-[2.65rem] h-4 w-4 text-brand-ink" aria-hidden="true" />
                <Select
                  label="To"
                  name="destinationCity"
                  value={form.destinationCity}
                  onChange={set('destinationCity')}
                  required
                  placeholder="Destination city"
                  options={cities.map((city) => ({ value: city, label: city }))}
                  className={cn(fieldControl, 'pl-7')}
                />
              </div>

              <div className="relative min-w-0 border-t border-line px-4 py-3 lg:border-t-0 lg:border-l">
                <CalendarDays className="pointer-events-none absolute left-4 top-[2.65rem] h-4 w-4 text-slate" aria-hidden="true" />
                <Input
                  label="Travel date"
                  type="date"
                  name="date"
                  value={form.date}
                  min={todayISODate()}
                  onChange={set('date')}
                  required
                  inputClassName={cn(fieldControl, 'pl-7')}
                />
              </div>

              <div className="relative min-w-0 border-t border-line px-4 py-3 lg:border-t-0 lg:border-l">
                <Users className="pointer-events-none absolute left-4 top-[2.65rem] h-4 w-4 text-slate" aria-hidden="true" />
                <Input
                  label="Passengers"
                  type="number"
                  name="passengers"
                  min={1}
                  max={6}
                  value={form.passengers}
                  onChange={set('passengers')}
                  required
                  inputClassName={cn(fieldControl, 'pl-7')}
                />
              </div>

              <div className="border-t border-line p-3 lg:border-t-0 lg:border-l lg:p-2.5 lg:pl-3">
                <Button type="submit" className="w-full whitespace-nowrap lg:min-w-[8.75rem]">
                  <FindRideLabel label={findLabel} />
                </Button>
              </div>
            </div>
          </div>
          <p className="mt-3 px-1 text-sm font-medium text-brand-ink">
            Cities come from the locations already listed in RaahiX.
          </p>
        </div>
        {status}
      </form>
    );
  }

  return (
    <form
      onSubmit={submit}
      className={cn(
        !bare && 'rounded-2xl border border-line bg-white/95 p-4 shadow-[var(--shadow-soft)] md:p-5',
        floating && !bare && '-mt-10 border-white/70 shadow-[var(--shadow-lift)] md:-mt-14',
        className
      )}
    >
      <div
        className={cn(
          'grid gap-3',
          bare || compact
            ? 'sm:grid-cols-2'
            : 'md:grid-cols-[1.1fr_auto_1.1fr_1fr_0.7fr_auto]'
        )}
      >
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-[2.55rem] h-4 w-4 text-brand-ink" aria-hidden="true" />
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
        {!compact && !bare ? (
          <div className="flex items-end justify-center pb-1">
            <SwapButton onClick={swap} />
          </div>
        ) : null}
        <div className="relative">
          <MapPinned className="pointer-events-none absolute left-3 top-[2.55rem] h-4 w-4 text-brand-ink" aria-hidden="true" />
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
        {bare ? (
          <div className="flex justify-end sm:col-span-2">
            <SwapButton onClick={swap} />
          </div>
        ) : null}
        <div className="relative">
          <CalendarDays className="pointer-events-none absolute left-3 top-[2.55rem] h-4 w-4 text-slate" aria-hidden="true" />
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
          <Users className="pointer-events-none absolute left-3 top-[2.55rem] h-4 w-4 text-slate" aria-hidden="true" />
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
        {compact || actionBelow ? null : (
          <div className="flex items-end">
            <Button type="submit" className="w-full md:min-w-[8.5rem]">
              <FindRideLabel label={findLabel} />
            </Button>
          </div>
        )}
      </div>
      {status}
      {compact || actionBelow ? (
        <Button type="submit" className="mt-3 w-full">
          <FindRideLabel label={findLabel} />
        </Button>
      ) : null}
    </form>
  );
}
