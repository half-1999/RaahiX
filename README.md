# RouteSeat — Local Scheduled Shared-Cab Booking Platform

MERN MVP for **scheduled shared-seat cab booking**. Operators publish timed rides with seat inventory; customers search, hold seats, pay online, and get confirmation. Drivers see assigned passengers; admins run operations.

This is **not** a real-time taxi-hailing product.

## Features (MVP)

- Role-based app: Customer, Driver, Admin (single React SPA)
- Route & ride scheduling with data-driven seat maps
- Atomic seat holds (10 minutes) + concurrency-safe booking
- Online payment (Razorpay adapter) with verify + webhook idempotency
- Email confirmation + WhatsApp prefilled action
- Driver trip status workflow
- Admin ops, basic reports, audit logs

## Architecture

```text
React (Vite) → REST API → Express services → Mongoose → MongoDB
```

See `docs/` for full product, API, database, and security documentation.

## Tech stack

| Layer | Stack |
|-------|--------|
| Frontend | React, Vite, Tailwind CSS, React Router, TanStack Query, Lucide |
| Backend | Node.js, Express, Mongoose, JWT, bcrypt, Zod |
| Database | MongoDB |
| Payments | Razorpay (abstracted) |
| Email | Nodemailer / console provider in development |

## Repository structure

```text
├── client/          # React SPA
├── server/          # Express API
├── docs/            # Product & technical documentation
├── scripts/         # Utility scripts
├── package.json     # Root convenience scripts
└── README.md
```

## Environment setup

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Fill MongoDB URI, JWT secrets, and optional payment/email keys. Never commit real secrets.

## Installation

```bash
npm run install:all
# or
npm install && npm install --prefix server && npm install --prefix client
```

Requires Node.js 20+ and a running MongoDB instance.

## Development

```bash
# both apps
npm run dev

# separately
npm run dev:server
npm run dev:client
```

- API: http://localhost:5055  
- Client: http://localhost:5173  
- Health: `GET /api/health`

> Note: default API port is **5055** (5000 is often taken). Override with `PORT` in `server/.env`.

## Database & seed

```bash
npm run seed
```

Seeds 1 admin, 3 drivers, 3 vehicles, 3 routes, 5 rides, 5 customers.  
Admin credentials come from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `server/.env`.

## Testing

```bash
npm test
```

Critical coverage: auth, seat concurrency, booking, payment idempotency, authorization.

## Production build

```bash
npm run build
cd server && npm start
```

Serve `client/dist` behind a static host; point `CLIENT_URL` / CORS to that origin.

## Documentation

Start at `docs/01-product/PRD.md` and `docs/08-implementation/PHASES.md`.

## License

Private / project use.
