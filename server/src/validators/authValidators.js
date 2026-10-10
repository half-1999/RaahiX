import { z } from 'zod';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(
        new AppError('Validation failed', {
          code: ErrorCodes.VALIDATION_ERROR,
          statusCode: 400,
          errors: result.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        })
      );
    }
    req[source] = result.data;
    return next();
  };
}

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(8).max(15),
  password: z.string().min(8).max(128),
});

const seatConfigSchema = z.object({
  seatNumber: z.string().min(1),
  row: z.number().int().min(1),
  position: z.string().min(1),
});

export const registerDriverSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(8).max(15),
  password: z.string().min(8).max(128),
  licenseNumber: z.string().min(3).max(40),
  vehicle: z.object({
    registrationNumber: z.string().min(4).max(20),
    make: z.string().min(1).max(60),
    model: z.string().min(1).max(60),
    vehicleType: z.enum(['5_SEATER', '6_SEATER', '7_SEATER', 'SEDAN', 'SUV', 'MUV']),
    capacity: z.number().int().min(1).max(6).optional(),
    seatConfiguration: z.array(seatConfigSchema).min(1).optional(),
    features: z.array(z.string()).optional(),
  }),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().min(8).max(15).optional(),
  payoutUpi: z.string().max(80).optional(),
  age: z.number().int().min(1).max(120).optional(),
  password: z.string().min(8).max(128).optional(),
  currentPassword: z.string().min(1).optional(),
}).refine((data) => Object.keys(data).some((k) => data[k] != null && data[k] !== ''), {
  message: 'At least one field is required',
}).refine((data) => !data.password || Boolean(data.currentPassword), {
  message: 'currentPassword is required to set a new password',
  path: ['currentPassword'],
});
