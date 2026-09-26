import { z } from 'zod';
import { validate } from './authValidators.js';
import {
  DRIVER_STATUS,
  DRIVER_VERIFICATION,
  RIDE_STATUS,
  ROUTE_STATUS,
  USER_STATUS,
  VEHICLE_STATUS,
} from '../constants/enums.js';

export { validate };

const objectId = z.string().min(1);

const seatConfigSchema = z.object({
  seatNumber: z.string().min(1),
  row: z.number().int().min(1),
  position: z.string().min(1),
});

const placeSchema = z.object({
  city: z.string().min(1),
  state: z.string().min(1),
});

const stopSchema = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  sequence: z.number().int().min(1),
});

export const searchRidesSchema = z.object({
  originCity: z.string().min(1),
  destinationCity: z.string().min(1),
  date: z.string().min(1),
  passengers: z.coerce.number().int().min(1).optional().default(1),
});

export const holdSeatsSchema = z.object({
  rideId: objectId,
  seatNumbers: z.array(z.string().min(1)).min(1),
});

export const createBookingSchema = z.object({
  rideId: objectId,
  holdId: z.string().min(1),
  passengers: z
    .array(
      z.object({
        name: z.string().min(1),
        phone: z.string().min(8),
        age: z.number().int().min(1).max(120),
        seatNumber: z.string().min(1),
      })
    )
    .min(1),
});

export const cancelBookingSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const createPaymentOrderSchema = z.object({
  bookingId: objectId,
});

export const verifyPaymentSchema = z.object({
  bookingId: objectId.optional(),
  orderId: z.string().optional(),
  paymentId: z.string().optional(),
  signature: z.string().optional(),
  /** Preferred field names for mock / non-Razorpay verify payloads */
  gatewayOrderId: z.string().optional(),
  gatewayPaymentId: z.string().optional(),
  /**
   * When PAYMENT_GATEWAY=mock, client may send mock:true and omit a real HMAC.
   * Server signs locally — never accepted when gateway is razorpay.
   */
  mock: z.boolean().optional(),
  razorpay_order_id: z.string().optional(),
  razorpay_payment_id: z.string().optional(),
  razorpay_signature: z.string().optional(),
});

export const driverStatusSchema = z.object({
  status: z.enum([RIDE_STATUS.BOARDING, RIDE_STATUS.STARTED, RIDE_STATUS.COMPLETED]),
});

export const createDriverSchema = z.object({
  userId: objectId.optional(),
  name: z.string().min(1).optional(),
  phone: z.string().min(8).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  licenseNumber: z.string().min(1),
  verificationStatus: z.enum(Object.values(DRIVER_VERIFICATION)).optional(),
  status: z.enum(Object.values(DRIVER_STATUS)).optional(),
});

export const updateDriverSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(8).optional(),
  licenseNumber: z.string().min(1).optional(),
  verificationStatus: z.enum(Object.values(DRIVER_VERIFICATION)).optional(),
  status: z.enum(Object.values(DRIVER_STATUS)).optional(),
  rating: z.number().min(0).max(5).optional(),
});

export const createVehicleSchema = z.object({
  driverId: objectId,
  registrationNumber: z.string().min(1),
  make: z.string().min(1),
  model: z.string().min(1),
  vehicleType: z.string().min(1),
  capacity: z.number().int().min(1),
  seatConfiguration: z.array(seatConfigSchema).min(1),
  features: z.array(z.string()).optional(),
  status: z.enum(Object.values(VEHICLE_STATUS)).optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export const createRouteSchema = z.object({
  origin: placeSchema,
  destination: placeSchema,
  stops: z.array(stopSchema).optional(),
  estimatedDuration: z.number().int().min(1),
  status: z.enum(Object.values(ROUTE_STATUS)).optional(),
});

export const updateRouteSchema = createRouteSchema.partial();

export const createRideSchema = z.object({
  routeId: objectId,
  driverId: objectId,
  vehicleId: objectId,
  date: z.string().min(1),
  departureTime: z.string().min(1),
  arrivalTime: z.string().min(1),
  pickupPoint: z.string().min(1),
  dropPoint: z.string().min(1),
  pricePerSeat: z.number().min(1),
});

export const updateRideSchema = z.object({
  routeId: objectId.optional(),
  driverId: objectId.optional(),
  vehicleId: objectId.optional(),
  date: z.string().optional(),
  departureTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  pickupPoint: z.string().optional(),
  dropPoint: z.string().optional(),
  pricePerSeat: z.number().min(1).optional(),
  status: z.enum(Object.values(RIDE_STATUS)).optional(),
  reason: z.string().optional(),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(Object.values(USER_STATUS)),
});

export const reportQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.string().optional(),
});
