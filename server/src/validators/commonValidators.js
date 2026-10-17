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
  seatNumbers: z.array(z.string().min(1)).min(1).max(6),
  pickupLocationId: objectId.optional(),
  dropLocationId: objectId.optional(),
  passengerCount: z.number().int().min(1).max(6).optional(),
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
  pickupLocationId: objectId.optional(),
  dropLocationId: objectId.optional(),
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
  status: z.enum([RIDE_STATUS.ACTIVE, RIDE_STATUS.COMPLETED]),
});

export const driverVoidRideSchema = z.object({
  reason: z.string().min(3).max(300).optional(),
});

export const driverRideSchema = z
  .object({
    routeId: objectId.optional(),
    sourceLocationId: objectId.optional(),
    destinationLocationId: objectId.optional(),
    origin: placeSchema.optional(),
    destination: placeSchema.optional(),
    vehicleId: objectId,
    departureTime: z.string().min(1),
    arrivalTime: z.string().min(1).optional(),
    estimatedDurationMinutes: z.number().int().min(1).max(10080).optional(),
    pricePerSeat: z.number().min(1),
    frontSeatPrice: z.number().min(0).optional(),
    capacity: z.number().int().min(1).max(6).optional(),
    pickupPoint: z.string().min(1).optional(),
    dropPoint: z.string().min(1).optional(),
    pickupPoints: z.array(z.string().min(1)).max(2).optional(),
    dropPoints: z.array(z.string().min(1)).max(2).optional(),
    notes: z.string().max(500).optional(),
  })
  .refine((data) => data.arrivalTime || data.estimatedDurationMinutes, {
    message: 'Provide arrivalTime or estimatedDurationMinutes',
  })
  .refine((data) => data.routeId || data.sourceLocationId || data.origin, {
    message: 'Provide a route or source location',
  });

export const driverUpdateRideSchema = z.object({
  departureTime: z.string().min(1).optional(),
  arrivalTime: z.string().min(1).optional(),
  estimatedDurationMinutes: z.number().int().min(1).max(10080).optional(),
  pricePerSeat: z.number().min(1).optional(),
  frontSeatPrice: z.number().min(0).nullable().optional(),
  pickupPoint: z.string().min(1).optional(),
  dropPoint: z.string().min(1).optional(),
  pickupPoints: z.array(z.string().min(1)).max(2).optional(),
  dropPoints: z.array(z.string().min(1)).max(2).optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const driverPassengerSchema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(8).max(20).optional(),
  email: z.string().email().optional(),
  seatCount: z.number().int().min(1).max(6).optional(),
  seatNumbers: z.array(z.string()).optional(),
  fareAmount: z.number().min(0).optional(),
  amountCollected: z.number().min(0).optional(),
  paymentStatus: z.enum(['PENDING', 'PARTIAL', 'PAID']).optional(),
  paymentMethod: z.string().max(60).optional(),
  paymentReference: z.string().max(120).optional(),
  pickupName: z.string().max(120).optional(),
  dropName: z.string().max(120).optional(),
  pickupLocationId: objectId.optional(),
  dropLocationId: objectId.optional(),
  pickup: placeSchema.optional(),
  drop: placeSchema.optional(),
  notes: z.string().max(500).optional(),
});

export const driverUpdatePassengerSchema = driverPassengerSchema.partial();

export const driverCapacitySchema = z.object({
  capacity: z.number().int().min(1).max(6),
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
  reason: z.string().min(3),
});

export const createVehicleSchema = z.object({
  driverId: objectId,
  registrationNumber: z.string().min(1),
  make: z.string().min(1),
  model: z.string().min(1),
  vehicleType: z.enum(['5_SEATER', '6_SEATER', '7_SEATER', 'SEDAN', 'SUV', 'MUV']),
  capacity: z.number().int().min(1).optional(),
  seatConfiguration: z.array(seatConfigSchema).min(1).optional(),
  features: z.array(z.string()).optional(),
  status: z.enum(Object.values(VEHICLE_STATUS)).optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export const driverVehicleSchema = createVehicleSchema.omit({ driverId: true });
export const driverUpdateVehicleSchema = updateVehicleSchema.omit({ driverId: true });

export const createRouteSchema = z.object({
  name: z.string().max(120).optional(),
  origin: placeSchema,
  destination: placeSchema,
  stops: z.array(stopSchema).optional(),
  estimatedDuration: z.number().int().min(1).max(10080),
  status: z.enum(Object.values(ROUTE_STATUS)).optional(),
});

export const updateRouteSchema = createRouteSchema.partial();

export const driverRouteSchema = z.object({
  name: z.string().max(120).optional(),
  estimatedDuration: z.number().int().min(1).max(10080),
  stops: z
    .array(
      z.object({
        name: z.string().min(1),
        city: z.string().min(1),
        state: z.string().min(1),
      })
    )
    .min(2),
  status: z.enum(Object.values(ROUTE_STATUS)).optional(),
});

export const driverUpdateRouteSchema = driverRouteSchema.partial();

export const updateLocationSchema = z.object({
  name: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  aliases: z.array(z.string().min(1)).optional(),
});

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
  frontSeatPrice: z.number().min(0).optional(),
  pickupPoints: z.array(z.string().min(1)).max(2).optional(),
  dropPoints: z.array(z.string().min(1)).max(2).optional(),
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
  status: z.enum([...Object.values(RIDE_STATUS), 'CANCELLED']).optional(),
  void: z.boolean().optional(),
  reason: z.string().min(3),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(Object.values(USER_STATUS)),
  reason: z.string().min(3),
});

export const paymentProofSchema = z.object({
  amount: z.number().min(0).optional(),
  screenshot: z.string().min(1),
});

export const paymentReviewSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().optional(),
});

export const refundUpdateSchema = z.object({
  refundStatus: z.enum(['NOT_APPLICABLE', 'PENDING', 'PARTIAL', 'COMPLETED', 'WAIVED']),
  refundReference: z.string().max(120).optional(),
  reason: z.string().min(3),
});

export const driverPaymentDetailsSchema = z.object({
  upiId: z.string().min(3).optional(),
  qrCode: z.string().optional(),
  paymentInstructions: z.string().max(500).optional(),
});

export const reportQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.string().optional(),
});
