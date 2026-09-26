# Deployment

## Prerequisites

- Node.js 20+
- MongoDB 6+
- Payment gateway account (test mode for staging)
- Email credentials (or console transport in staging)

## Environment

Copy `server/.env.example` and `client/.env.example`. Never commit real `.env`.

## Build

```bash
# server
cd server && npm ci && npm start

# client
cd client && npm ci && npm run build
```

Serve `client/dist` via static host or CDN; point `CLIENT_URL` / CORS accordingly. API on `PORT`.

## Process

Single Node process for API is enough for MVP scale. Use a process manager (PM2/systemd) in production. Enable MongoDB auth + TLS network rules.

## Health

`GET /api/health` → `{ success: true, data: { status: 'ok' } }`

## Backups

Enable MongoDB provider backups before production traffic.

## Rollback

Keep previous server build artifact; feature flags not required for MVP.
