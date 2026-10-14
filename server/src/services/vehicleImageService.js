import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { Vehicle } from '../models/Vehicle.js';
import { Driver } from '../models/Driver.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';

const imageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.data/vehicle-images');

function decodeImage(image) {
  const match = String(image || '').match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) {
    throw new AppError('Image must be a PNG, JPEG, or WebP file', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!buffer.length || buffer.length > 2 * 1024 * 1024) {
    throw new AppError('Image must be between 1 byte and 2 MB', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }
  const mime = match[1] === 'image/jpg' ? 'image/jpeg' : match[1];
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  return { mime, buffer, ext };
}

async function ownVehicle(userId, vehicleId) {
  const driver = await Driver.findOne({ userId });
  if (!driver) {
    throw new AppError('Driver profile not found', { code: ErrorCodes.DRIVER_NOT_FOUND, statusCode: 404 });
  }
  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle || vehicle.driverId.toString() !== driver._id.toString()) {
    throw new AppError('Vehicle not found', { code: ErrorCodes.VEHICLE_NOT_FOUND, statusCode: 404 });
  }
  return vehicle;
}

export async function addImage(userId, vehicleId, image) {
  const vehicle = await ownVehicle(userId, vehicleId);
  if ((vehicle.images || []).length >= 4) {
    throw new AppError('A car can have up to 4 photos', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }
  const file = decodeImage(image);
  await fs.mkdir(imageDir, { recursive: true });
  const filename = `${randomUUID()}.${file.ext}`;
  await fs.writeFile(path.join(imageDir, filename), file.buffer);
  const primary = !vehicle.images?.some((item) => item.primary);
  vehicle.images.push({ file: filename, mime: file.mime, primary });
  await vehicle.save();
  return vehicle;
}

export async function removeImage(userId, vehicleId, imageId) {
  const vehicle = await ownVehicle(userId, vehicleId);
  const image = vehicle.images.id(imageId);
  if (!image) {
    throw new AppError('Photo not found', { code: ErrorCodes.VALIDATION_ERROR, statusCode: 404 });
  }
  const wasPrimary = image.primary;
  await fs.unlink(path.join(imageDir, image.file)).catch(() => {});
  image.deleteOne();
  if (wasPrimary && vehicle.images[0]) vehicle.images[0].primary = true;
  await vehicle.save();
  return vehicle;
}

export async function readPrimary(vehicleId) {
  const vehicle = await Vehicle.findById(vehicleId).select('images');
  const image = vehicle?.images?.find((item) => item.primary) || vehicle?.images?.[0];
  if (!image) {
    throw new AppError('No car photo', { code: ErrorCodes.VALIDATION_ERROR, statusCode: 404 });
  }
  const buffer = await fs.readFile(path.join(imageDir, image.file));
  return { buffer, mime: image.mime };
}
