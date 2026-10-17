/** Shared ride status helpers — three canonical statuses only. */

export const ACTIVE_STATUSES = new Set(['ACTIVE']);
export const SCHEDULED_STATUSES = new Set(['SCHEDULED']);
export const EDITABLE_STATUSES = new Set(['SCHEDULED']);
export const READONLY_STATUSES = new Set(['COMPLETED']);

const STATUS_RANK = {
  ACTIVE: 0,
  SCHEDULED: 1,
  COMPLETED: 2,
};

export function isRideActive(status) {
  return ACTIVE_STATUSES.has(status);
}

export function isRideEditable(status) {
  return EDITABLE_STATUSES.has(status);
}

export function isRideReadOnly(status) {
  return READONLY_STATUSES.has(status);
}

export function statusSortRank(status) {
  return STATUS_RANK[status] ?? 5;
}

/** Active first, then scheduled by time, then completed. */
export function sortRidesActiveFirst(rides, { direction = 'asc' } = {}) {
  const dir = direction === 'desc' ? -1 : 1;
  return [...rides].sort((a, b) => {
    const ra = statusSortRank(a.status);
    const rb = statusSortRank(b.status);
    if (ra !== rb) return ra - rb;
    const ta = new Date(a.departureTime).getTime() || 0;
    const tb = new Date(b.departureTime).getTime() || 0;
    if (ta !== tb) return (ta - tb) * dir;
    return String(a._id || '').localeCompare(String(b._id || ''));
  });
}

function startOfLocalDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function isSameLocalDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Bucket rides for schedule sections. Completed always go to completed.
 */
export function bucketRideBySchedule(ride, now = new Date()) {
  if (ride.status === 'COMPLETED') return 'completed';

  const dep = new Date(ride.departureTime);
  if (Number.isNaN(dep.getTime())) return 'upcoming';

  const today = startOfLocalDay(now);
  const tomorrow = addDays(today, 1);
  const dayAfter = addDays(today, 2);

  if (isSameLocalDay(dep, today)) return 'today';
  if (isSameLocalDay(dep, tomorrow)) return 'tomorrow';
  if (isSameLocalDay(dep, dayAfter)) return 'dayAfter';
  if (dep >= addDays(today, 3)) return 'upcoming';
  if (dep < today) return 'today';
  return 'upcoming';
}

export const TRIP_SECTIONS = [
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'dayAfter', label: 'Day after tomorrow' },
  { id: 'upcoming', label: 'Upcoming scheduled' },
  { id: 'completed', label: 'Completed' },
];

export const RIDE_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
];
