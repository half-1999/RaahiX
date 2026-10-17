import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Route as RouteIcon, Search } from 'lucide-react';
import { driverService } from '../../services/driverService';
import { getErrorMessage } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import SearchFiltersBar from '../../components/common/SearchFiltersBar';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';

const CORE_LOCATIONS = [
  { city: 'Richha', district: 'Richha', state: 'Uttar Pradesh' },
  { city: 'Delhi', district: 'Delhi', state: 'Delhi' },
  { city: 'Noida', district: 'Noida', state: 'Uttar Pradesh' },
  { city: 'Gurugram', district: 'Gurugram', state: 'Haryana' },
];

function locationKey(loc) {
  return `${(loc.city || '').toLowerCase()}|${(loc.state || '').toLowerCase()}`;
}

function locationLabel(loc) {
  if (!loc) return '';
  return `${loc.city} · ${loc.state}`;
}

function toPlace(loc) {
  return {
    name: loc.city,
    city: loc.city,
    state: loc.state,
  };
}

function emptyForm() {
  return {
    name: '',
    originKey: '',
    destinationKey: '',
    stopKeys: [],
    duration: '420',
  };
}

export default function DriverRoutesPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [locationSearch, setLocationSearch] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  const routesQuery = useQuery({
    queryKey: ['driver', 'routes'],
    queryFn: () => driverService.listRoutes(),
  });
  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: () => driverService.listLocations(),
  });

  const routes = routesQuery.data?.routes || [];
  const apiLocations = locationsQuery.data?.locations || [];

  const catalog = useMemo(() => {
    const map = new Map();
    for (const core of CORE_LOCATIONS) {
      map.set(locationKey(core), {
        city: core.city,
        district: core.district,
        state: core.state,
        name: core.city,
      });
    }
    for (const loc of apiLocations) {
      const key = locationKey(loc);
      map.set(key, {
        city: loc.city,
        district: loc.name || loc.city,
        state: loc.state,
        name: loc.name || loc.city,
        _id: loc._id,
      });
    }
    return [...map.values()].sort((a, b) => a.city.localeCompare(b.city));
  }, [apiLocations]);

  const byKey = useMemo(() => {
    const map = new Map();
    for (const loc of catalog) map.set(locationKey(loc), loc);
    return map;
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    const q = locationSearch.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((loc) => locationLabel(loc).toLowerCase().includes(q));
  }, [catalog, locationSearch]);

  const options = filteredCatalog.map((loc) => ({
    value: locationKey(loc),
    label: locationLabel(loc),
  }));

  const filteredRoutes = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return routes;
    return routes.filter((route) =>
      [
        route.name,
        route.origin?.city,
        route.destination?.city,
        ...(route.stops || []).map((s) => s.city),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [routes, listSearch]);

  useEffect(() => {
    if (searchParams.get('new') === '1' || searchParams.get('new') === 'route') {
      openCreate();
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setError('');
    setModalOpen(true);
  }

  function openEdit(route) {
    setEditing(route);
    const origin = locationKey(route.origin || {});
    const destination = locationKey(route.destination || {});
    setForm({
      name: route.name || '',
      originKey: origin,
      destinationKey: destination,
      stopKeys: (route.stops || []).map((s) => locationKey(s)),
      duration: String(route.estimatedDuration || 420),
    });
    setError('');
    setModalOpen(true);
  }

  function buildStopsPayload() {
    const origin = byKey.get(form.originKey);
    const destination = byKey.get(form.destinationKey);
    if (!origin || !destination) throw new Error('Source and destination are required');
    if (form.originKey === form.destinationKey) {
      throw new Error('Source and destination must be different');
    }
    const mins = Number(form.duration);
    if (!Number.isInteger(mins) || mins < 1) {
      throw new Error('Estimated duration must be a positive whole number of minutes');
    }
    const middles = form.stopKeys
      .map((key) => byKey.get(key))
      .filter(Boolean)
      .filter((loc) => locationKey(loc) !== form.originKey && locationKey(loc) !== form.destinationKey);
    return {
      name: form.name.trim() || `${origin.city} → ${destination.city}`,
      estimatedDuration: mins,
      stops: [toPlace(origin), ...middles.map(toPlace), toPlace(destination)],
    };
  }

  const save = useMutation({
    mutationFn: () => {
      const payload = buildStopsPayload();
      if (editing) return driverService.updateRoute(editing._id, payload);
      return driverService.createRoute(payload);
    },
    onSuccess: () => {
      setError('');
      setSuccess(editing ? 'Route updated' : 'Route created');
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm());
      queryClient.invalidateQueries({ queryKey: ['driver', 'routes'] });
      queryClient.invalidateQueries({ queryKey: ['driver', 'routes', 'available'] });
    },
    onError: (err) => setError(getErrorMessage(err, err?.message)),
  });

  const deactivate = useMutation({
    mutationFn: (id) => driverService.deactivateRoute(id),
    onSuccess: () => {
      setDeactivateTarget(null);
      setSuccess('Route deactivated');
      queryClient.invalidateQueries({ queryKey: ['driver', 'routes'] });
      queryClient.invalidateQueries({ queryKey: ['driver', 'routes', 'available'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  function addStop() {
    const available = catalog.find(
      (loc) =>
        locationKey(loc) !== form.originKey &&
        locationKey(loc) !== form.destinationKey &&
        !form.stopKeys.includes(locationKey(loc))
    );
    if (!available) return;
    setForm((f) => ({ ...f, stopKeys: [...f.stopKeys, locationKey(available)] }));
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Routes"
        subtitle="Searchable corridor cities. Duration is entered manually in minutes."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create route
          </Button>
        }
      />

      {error && !modalOpen ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      <SearchFiltersBar
        activeCount={listSearch ? 1 : 0}
        onReset={() => setListSearch('')}
      >
        <label className="relative min-w-0 w-full md:max-w-sm md:flex-1">
          <span className="sr-only">Search routes</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate" aria-hidden="true" />
          <input
            className="h-11 w-full rounded-xl border border-line bg-white py-2 pr-3 pl-9 text-sm"
            placeholder="Search routes…"
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
          />
        </label>
      </SearchFiltersBar>

      {routesQuery.isLoading ? <p className="text-sm text-slate">Loading routes…</p> : null}

      {!routesQuery.isLoading && !filteredRoutes.length ? (
        <EmptyState
          icon={RouteIcon}
          title="No routes yet"
          description="Create a route using Richha, Delhi, Noida, or Gurugram."
          action={
            <Button size="sm" onClick={openCreate}>
              Create route
            </Button>
          }
        />
      ) : null}

      <ul className="space-y-2">
        {filteredRoutes.map((route) => (
          <li
            key={route._id}
            className="rounded-2xl border-2 border-ink/10 bg-white px-4 py-3 shadow-[var(--shadow-soft)]"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-display text-[clamp(1rem,1.2vw+0.5rem,1.2rem)] font-bold text-ink">
                  {route.name || `${route.origin?.city} → ${route.destination?.city}`}
                </p>
                <p className="text-sm text-slate">
                  {locationLabel(route.origin)} → {locationLabel(route.destination)}
                </p>
                <p className="text-sm text-slate">
                  {(route.stops || []).map((stop) => stop.city).join(' · ') || 'Direct'}
                  {route.estimatedDuration ? ` · ${route.estimatedDuration} min` : ''}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  {route.status || 'ACTIVE'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(route)}>
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Edit
                </Button>
                {route.status !== 'INACTIVE' ? (
                  <Button size="sm" variant="danger" onClick={() => setDeactivateTarget(route)}>
                    Deactivate
                  </Button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Modal
        open={modalOpen}
        onClose={() => !save.isPending && setModalOpen(false)}
        title={editing ? 'Edit route' : 'Create route'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={save.isPending}>
              Cancel
            </Button>
            <Button
              loading={save.isPending}
              onClick={() => {
                try {
                  buildStopsPayload();
                } catch (err) {
                  setError(err.message);
                  return;
                }
                save.mutate();
              }}
            >
              {editing ? 'Save changes' : 'Create route'}
            </Button>
          </>
        }
      >
        {error ? <Alert tone="error" className="mb-3">{error}</Alert> : null}

        <label className="mb-3 block text-sm font-medium text-ink">
          Route name
          <input
            className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-sm"
            placeholder="e.g. Richha evening corridor"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </label>

        <label className="mb-3 block text-sm font-medium text-ink">
          Search locations
          <input
            className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-sm"
            placeholder="Filter by city or state…"
            value={locationSearch}
            onChange={(e) => setLocationSearch(e.target.value)}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Source"
            value={form.originKey}
            onChange={(e) => setForm((f) => ({ ...f, originKey: e.target.value }))}
            options={options.filter((o) => o.value !== form.destinationKey)}
            placeholder="Choose source city"
            required
          />
          <Select
            label="Destination"
            value={form.destinationKey}
            onChange={(e) => setForm((f) => ({ ...f, destinationKey: e.target.value }))}
            options={options.filter((o) => o.value !== form.originKey)}
            placeholder="Choose destination city"
            required
          />
          <label className="block text-sm font-medium text-ink sm:col-span-2">
            Estimated duration (minutes)
            <input
              type="number"
              min="1"
              max="10080"
              className="mt-1 h-11 w-full rounded-xl border border-line px-3 sm:max-w-xs"
              value={form.duration}
              onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
            />
          </label>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-ink">Intermediate stops</p>
              <p className="text-xs text-slate">Optional. Keep order along the travel corridor.</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={addStop}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add stop
            </Button>
          </div>
          {form.stopKeys.length ? (
            <ul className="space-y-2">
              {form.stopKeys.map((key, index) => (
                <li key={`${key}-${index}`} className="flex flex-wrap items-end gap-2">
                  <Select
                    className="min-w-0 flex-1"
                    label={`Stop ${index + 1}`}
                    value={key}
                    onChange={(e) => {
                      const next = [...form.stopKeys];
                      next[index] = e.target.value;
                      setForm((f) => ({ ...f, stopKeys: next }));
                    }}
                    options={options.filter(
                      (o) =>
                        o.value === key ||
                        (o.value !== form.originKey &&
                          o.value !== form.destinationKey &&
                          !form.stopKeys.includes(o.value))
                    )}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        stopKeys: f.stopKeys.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        title="Deactivate route?"
        description="Inactive routes will no longer appear when creating new rides."
        confirmLabel="Deactivate"
        loading={deactivate.isPending}
        onConfirm={() => deactivate.mutate(deactivateTarget._id)}
      />
    </div>
  );
}
