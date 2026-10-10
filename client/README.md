# RaahiX Client

React + Vite SPA for RaahiX, scheduled intercity shared rides. A product by The Stack Guy.

## Stack

- React 19 + Vite 8
- Tailwind CSS v4 (`@tailwindcss/vite`)
- React Router, TanStack Query, Axios, Lucide, Framer Motion

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

App: http://localhost:5173  
API proxy: `/api` → `http://localhost:5000` (or set `VITE_API_URL`)

## Env

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Axios base URL (default `/api`) |
| `VITE_PAYMENT_KEY_ID` | Razorpay key; placeholder/mock triggers mock verify |
| `VITE_WHATSAPP_NUMBER` | Optional `wa.me` number for share button |

## Scripts

- `npm run dev` — Vite dev server
- `npm run build` — production build
- `npm run preview` — preview build

## Roles

- Customer: search → seats → hold → checkout → bookings
- Driver: `/driver` today’s trip + passengers + status
- Admin: `/admin` ops tables, CRUD, reports, audit logs
