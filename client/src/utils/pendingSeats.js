const PENDING_SEATS_KEY = 'raahix_pending_seats';
const AUTO_HOLD_KEY = 'raahix_auto_hold';

export function savePendingSeats(rideId, seatNumbers = []) {
  if (!rideId || !seatNumbers.length) {
    sessionStorage.removeItem(PENDING_SEATS_KEY);
    return;
  }
  sessionStorage.setItem(
    PENDING_SEATS_KEY,
    JSON.stringify({ rideId: String(rideId), seats: seatNumbers, savedAt: Date.now() })
  );
}

export function loadPendingSeats(rideId) {
  try {
    const raw = sessionStorage.getItem(PENDING_SEATS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!data?.rideId || String(data.rideId) !== String(rideId)) return [];
    if (Date.now() - (data.savedAt || 0) > 30 * 60 * 1000) {
      sessionStorage.removeItem(PENDING_SEATS_KEY);
      return [];
    }
    return Array.isArray(data.seats) ? data.seats.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function clearPendingSeats() {
  sessionStorage.removeItem(PENDING_SEATS_KEY);
}

/** Mark that next visit to this ride should auto-hold once (after login). */
export function markAutoHold(rideId) {
  if (!rideId) return;
  sessionStorage.setItem(AUTO_HOLD_KEY, String(rideId));
}

export function consumeAutoHold(rideId) {
  const marked = sessionStorage.getItem(AUTO_HOLD_KEY);
  if (!marked || String(marked) !== String(rideId)) return false;
  sessionStorage.removeItem(AUTO_HOLD_KEY);
  return true;
}
