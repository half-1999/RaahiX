import { Location } from '../models/Location.js';
import { Route } from '../models/Route.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { writeAudit } from './auditService.js';

export function normalizePlaceName(value) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function resolveLocation({ name, city, state, country, latitude, longitude }, actor = null) {
  const normalizedName = normalizePlaceName(name || city);
  const normalizedCity = normalizePlaceName(city || name);
  const normalizedState = normalizePlaceName(state || city || name);

  if (!normalizedName || !normalizedCity || !normalizedState) {
    throw new AppError('A location needs a name, city, and state', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }

  const existing = await Location.findOne({
    isActive: { $ne: false },
    normalizedCity,
    normalizedState,
    $or: [{ normalizedName }, { aliases: normalizedName }],
  });
  if (existing) return existing;

  return Location.create({
    name: String(name || city).trim(),
    normalizedName,
    city: String(city || name).trim(),
    state: String(state || city || name).trim(),
    country: country ? String(country).trim() : 'India',
    normalizedCity,
    normalizedState,
    aliases: [],
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    createdByUserId: actor?._id || null,
    isActive: true,
  });
}

export async function searchLocations(q = '', { limit = 20 } = {}) {
  await ensureCoreLocations();
  const term = String(q || '').trim();
  const filter = { isActive: { $ne: false } };
  if (term) {
    const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: re }, { city: re }, { state: re }, { aliases: re }];
  }
  const locations = await Location.find(filter)
    .sort({ city: 1, name: 1 })
    .limit(Math.min(50, Number(limit) || 20));
  return { locations };
}

export async function createLocation(input, actor) {
  const location = await resolveLocation(input, actor);
  return location;
}

export async function toPlace(input) {
  const location = await resolveLocation(input);
  return {
    name: location.name,
    city: location.city,
    state: location.state,
    locationId: location._id,
  };
}

const CORE_CORRIDOR = [
  { name: 'Richha', city: 'Richha', state: 'Uttar Pradesh' },
  { name: 'Delhi', city: 'Delhi', state: 'Delhi' },
  { name: 'Noida', city: 'Noida', state: 'Uttar Pradesh' },
  { name: 'Gurugram', city: 'Gurugram', state: 'Haryana' },
];

export async function ensureCoreLocations() {
  const results = [];
  for (const place of CORE_CORRIDOR) {
    results.push(await resolveLocation(place));
  }
  return results;
}

export async function listLocations() {
  await ensureCoreLocations();
  const locations = await Location.find({ isActive: { $ne: false } }).sort({
    state: 1,
    city: 1,
    name: 1,
  });
  return { locations };
}

export async function updateLocation(id, updates, actor) {
  const location = await Location.findById(id);
  if (!location) {
    throw new AppError('Location not found', {
      code: ErrorCodes.ROUTE_NOT_FOUND,
      statusCode: 404,
    });
  }

  const oldValue = {
    name: location.name,
    city: location.city,
    state: location.state,
    aliases: location.aliases,
  };

  if (updates.name) location.name = updates.name.trim();
  if (updates.city) location.city = updates.city.trim();
  if (updates.state) location.state = updates.state.trim();
  if (updates.name || updates.city || updates.state) {
    location.normalizedName = normalizePlaceName(location.name);
    location.normalizedCity = normalizePlaceName(location.city);
    location.normalizedState = normalizePlaceName(location.state);
  }
  if (Array.isArray(updates.aliases)) {
    location.aliases = [...new Set(updates.aliases.map((alias) => normalizePlaceName(alias)).filter(Boolean))];
  }

  await location.save();

  await writeAudit({
    actorId: actor._id,
    actorRole: actor.role,
    action: 'LOCATION_UPDATED',
    entityType: 'Location',
    entityId: location._id,
    oldValue,
    newValue: {
      name: location.name,
      city: location.city,
      state: location.state,
      aliases: location.aliases,
    },
  });

  return location;
}

export async function listPublicCities() {
  await ensureCoreLocations();
  const [locations, routes] = await Promise.all([
    Location.find().select('name city state').sort({ city: 1, name: 1 }).lean(),
    Route.find({ status: 'ACTIVE' }).select('origin destination stops').lean(),
  ]);
  const names = new Set(locations.map((row) => row.city).filter(Boolean));
  for (const route of routes) {
    for (const place of [route.origin, route.destination, ...(route.stops || [])]) {
      if (place?.city) names.add(place.city);
    }
  }
  const cities = [...names].sort((a, b) => a.localeCompare(b));
  return { cities, locations };
}
