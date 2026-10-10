import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');

// Always load server/.env from this file's location (not process.cwd()).
dotenv.config({ path: envPath, override: true });

const required = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    console.warn(`[config] Missing env ${key} — set it before production use`);
  }
}

function parseClientUrls(raw) {
  const listed = String(raw || 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set(listed)];
}

const clientUrls = parseClientUrls(process.env.CLIENT_URL);

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5055,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/local_cab_booking',
  useMemoryMongo: process.env.USE_MEMORY_MONGO === 'true',
  clientUrl: clientUrls[0],
  clientUrls,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret_change_me_32chars',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me_32chars',
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '7d',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '30d',
  },
  email: {
    provider: process.env.EMAIL_PROVIDER || 'console',
    from: process.env.EMAIL_FROM || 'noreply@localcab.example',
    apiKey: process.env.EMAIL_API_KEY || '',
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: Number(process.env.SMTP_PORT) || 587,
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  },
  payment: {
    gateway: process.env.PAYMENT_GATEWAY || 'razorpay',
    keyId: process.env.PAYMENT_KEY_ID || '',
    keySecret: process.env.PAYMENT_KEY_SECRET || '',
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || '',
  },
  whatsappNumber: process.env.WHATSAPP_NUMBER || '919999999999',
  holdDurationMinutes: Number(process.env.HOLD_DURATION_MINUTES) || 10,
  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@localcab.dev',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
  },
};
