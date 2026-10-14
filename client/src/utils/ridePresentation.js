/** Car presentation helpers. Amenities come only from the vehicle record. */
import { API_URL } from '../services/api';
import { stockCabImage } from './cabImages';

export function rideAmenities(ride) {
  return ride?.vehicle?.features || ride?.features || [];
}

export function cabDisplayName(ride) {
  if (ride?.vehicle?.make) {
    return `${ride.vehicle.make} ${ride.vehicle.model || ''}`.trim();
  }
  return ride?.vehicleType || ride?.operatorName || 'Premium Traveller';
}

export function rideHeroImage(ride) {
  const vehicleId = ride?.vehicle?.id || ride?.vehicle?._id;
  if (vehicleId && ride?.vehicle?.images?.length) return `${API_URL}/vehicles/${vehicleId}/photo`;
  return stockCabImage(
    ride?.vehicle?.make,
    ride?.vehicle?.model,
    ride?.vehicle?.vehicleType || ride?.vehicleType
  );
}

export function seatMeta(seatNumber = '', position = '') {
  const n = String(seatNumber).toUpperCase();
  const pos = String(position || '').toUpperCase();
  const row = n.charAt(0);
  const col = Number(n.slice(1)) || 1;
  const window =
    pos.includes('WINDOW') ||
    pos === 'FRONT' ||
    col === 1 ||
    col === 3 ||
    /LEFT|RIGHT/i.test(pos);
  const premium = row === 'A' || pos === 'FRONT';
  const legroom = row === 'A' || row === 'B';
  return {
    window,
    premium,
    legroom,
    label: [window ? 'Window' : 'Aisle', premium ? 'Premium' : null, legroom ? 'Extra legroom' : null]
      .filter(Boolean)
      .join(' · '),
    blurb: window ? 'Great view along the corridor' : 'Comfortable centre seating',
  };
}
