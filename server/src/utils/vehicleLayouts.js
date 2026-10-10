/**
 * Shared vehicle seat layouts for RaahiX.
 * Driver seat is visual-only; capacities are bookable passenger seats.
 */
import { AppError } from './AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';

export const MAX_VEHICLE_SEATS = 6;

export const VEHICLE_TYPES = Object.freeze({
  FIVE_SEATER: '5_SEATER',
  SIX_SEATER: '6_SEATER',
});

export const VEHICLE_TYPE_OPTIONS = [
  {
    value: VEHICLE_TYPES.FIVE_SEATER,
    label: 'Sedan (5 including driver, 4 bookable)',
    shortLabel: '4 seats',
    capacity: 4,
  },
  {
    value: VEHICLE_TYPES.SIX_SEATER,
    label: 'SUV (7 including driver, 6 bookable)',
    shortLabel: '6 seats',
    capacity: 6,
  },
];

export function vehicleTypeLabel(type) {
  const normalized = normalizeVehicleType(type);
  return VEHICLE_TYPE_OPTIONS.find((o) => o.value === normalized)?.label || type || 'Cab';
}

/**
 * Cabin seat configuration (passenger seats only).
 * Positions: WINDOW_LEFT | MIDDLE | WINDOW_RIGHT | FRONT
 */
export function seatConfigurationForType(vehicleType) {
  const type = normalizeVehicleType(vehicleType);

  if (type === VEHICLE_TYPES.SIX_SEATER) {
    return [
      { seatNumber: 'A1', row: 1, position: 'FRONT' },
      { seatNumber: 'B1', row: 2, position: 'WINDOW_LEFT' },
      { seatNumber: 'B2', row: 2, position: 'MIDDLE' },
      { seatNumber: 'B3', row: 2, position: 'WINDOW_RIGHT' },
      { seatNumber: 'C1', row: 3, position: 'WINDOW_LEFT' },
      { seatNumber: 'C2', row: 3, position: 'WINDOW_RIGHT' },
    ];
  }

  return [
    { seatNumber: 'A1', row: 1, position: 'FRONT' },
    { seatNumber: 'B1', row: 2, position: 'WINDOW_LEFT' },
    { seatNumber: 'B2', row: 2, position: 'MIDDLE' },
    { seatNumber: 'B3', row: 2, position: 'WINDOW_RIGHT' },
  ];
}

export function capacityForType(vehicleType) {
  return seatConfigurationForType(vehicleType).length;
}

export function normalizeVehicleType(raw) {
  const v = String(raw || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (
    v.includes('6') ||
    v.includes('7') ||
    v === 'SUV' ||
    v === 'MUV' ||
    v === 'SIX_SEATER' ||
    v === 'SEVEN_SEATER' ||
    v === '6_SEATER' ||
    v === '7_SEATER'
  ) {
    return VEHICLE_TYPES.SIX_SEATER;
  }
  return VEHICLE_TYPES.FIVE_SEATER;
}

export function resolveVehicleSeats({ vehicleType, capacity, seatConfiguration } = {}) {
  const type = normalizeVehicleType(vehicleType);
  const seats =
    Array.isArray(seatConfiguration) && seatConfiguration.length
      ? seatConfiguration
      : seatConfigurationForType(type);
  if ((capacity != null && Number(capacity) > MAX_VEHICLE_SEATS) || seats.length > MAX_VEHICLE_SEATS) {
    throw new AppError(`Vehicle capacity cannot exceed ${MAX_VEHICLE_SEATS}`, {
      code: ErrorCodes.VEHICLE_CAPACITY_EXCEEDED,
      statusCode: 400,
    });
  }
  return {
    vehicleType: type,
    capacity: seats.length,
    seatConfiguration: seats,
  };
}
