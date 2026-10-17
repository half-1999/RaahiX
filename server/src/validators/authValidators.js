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

const accountFields = {
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(8).max(15),
  password: z.string().min(8).max(128),
};

export const registerSchema = z.object(accountFields);

export const registerDriverSchema = z.object(accountFields);

export const loginSchema = z.object({
  email: z.string().min(1).max(120),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const updateProfileSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    phone: z.string().min(8).max(15).optional(),
    payoutUpi: z.string().max(80).optional(),
    age: z.number().int().min(1).max(120).nullable().optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT']).nullable().optional(),
    city: z.string().max(80).optional(),
    state: z.string().max(80).optional(),
    address: z.string().max(200).optional(),
    bio: z.string().max(300).optional(),
    dateOfBirth: z.string().max(32).nullable().optional(),
    licenseNumber: z.string().min(5).max(40).optional(),
    upiId: z.string().max(80).optional(),
    paymentInstructions: z.string().max(400).optional(),
    password: z.string().min(8).max(128).optional(),
    currentPassword: z.string().min(1).optional(),
  })
  .refine((data) => Object.keys(data).some((k) => data[k] != null && data[k] !== ''), {
    message: 'At least one field is required',
  })
  .refine((data) => !data.password || Boolean(data.currentPassword), {
    message: 'currentPassword is required to set a new password',
    path: ['currentPassword'],
  });
