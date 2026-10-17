import { User } from '../models/User.js';

export function slugifyUsername(value) {
  const base = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 18);
  return base || 'raahi';
}

export async function generateUniqueUsername({ name, email }) {
  const fromName = slugifyUsername(name);
  const fromEmail = slugifyUsername(String(email || '').split('@')[0]);
  const base = fromName.length >= 3 ? fromName : fromEmail;
  let candidate = base;
  let n = 0;
  while (await User.exists({ username: candidate })) {
    n += 1;
    candidate = `${base}${n}`.slice(0, 24);
  }
  return candidate;
}

export async function ensureUserUsername(user, { save = true } = {}) {
  if (user.username) return user;
  user.username = await generateUniqueUsername({ name: user.name, email: user.email });
  if (save) await user.save();
  return user;
}
