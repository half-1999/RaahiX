# Backend Architecture

## Entry

- `src/server.js` — HTTP listen, DB connect, start jobs
- `src/app.js` — Express app: middleware, routes, error handler

## Layering

```text
Route → Validator → Controller → Service → Model
```

Controllers: parse req, call service, send envelope.  
Services: transactions, rules, orchestration.  
Models: schema + indexes only.

## Cross-cutting

- `middleware/auth.js` — JWT verify
- `middleware/authorize.js` — role check
- `middleware/validate.js` — schema validation
- `middleware/rateLimit.js` — auth/payment sensitive
- `middleware/errorHandler.js` — AppError → envelope
- `utils/logger.js` — structured logs
- `constants/errorCodes.js`

## Config

Env-driven: Mongo URI, JWT secrets, CORS `CLIENT_URL`, payment keys, email keys, WhatsApp number, seed admin.

## Jobs

`jobs/expireHolds.js` — periodic scan/release of expired HELD seats and related PENDING bookings → EXPIRED.
