import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

// 10 rounds is plenty for MVP and keeps login/register responsive.
const SALT_ROUNDS = 10;

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, type: 'access' },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpires }
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpires }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}

export async function hashToken(token) {
  // SHA-256 — bcrypt on JWTs made every login/refresh multi-second slow.
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export async function compareToken(token, hash) {
  if (!hash) return false;
  const next = await hashToken(token);
  // Constant-time compare when both are hex strings of equal length
  try {
    const a = Buffer.from(String(hash), 'utf8');
    const b = Buffer.from(String(next), 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return hash === next;
  }
}
