/**
 * Normalize booking payloads from the API (rideId/routeId) into the
 * client-friendly shape (ride/route/vehicle) used across pages.
 */
export function normalizeRide(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw === 'string') return { id: raw };

  const route = raw.route || raw.routeId;
  const vehicle = raw.vehicle || raw.vehicleId;
  const driver = raw.driver || raw.driverId;

  return {
    ...raw,
    id: raw.id || raw._id,
    route: route && typeof route === 'object' ? route : raw.route,
    vehicle: vehicle && typeof vehicle === 'object' ? vehicle : raw.vehicle,
    driver: driver && typeof driver === 'object' ? driver : raw.driver,
    origin: raw.origin || route?.origin,
    destination: raw.destination || route?.destination,
    estimatedDuration: raw.estimatedDuration || route?.estimatedDuration,
  };
}

export function normalizeBooking(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const rideSource = raw.ride || raw.rideId;
  const ride = normalizeRide(typeof rideSource === 'object' ? rideSource : null);

  return {
    ...raw,
    id: raw.id || raw._id,
    ride,
    rideId: typeof raw.rideId === 'object' ? raw.rideId?._id || raw.rideId?.id : raw.rideId,
  };
}
