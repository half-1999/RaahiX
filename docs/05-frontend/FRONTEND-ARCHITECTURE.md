# Frontend Architecture

## Design read (Taste Skill)

Reading this as: **trust-first consumer booking product + operational dashboards**, for travelers and cab operators in North India, with a **calm, practical transport-brand language** (clear search, times, seats, price)—not a generic purple SaaS template. Customer marketing/home leans editorial transport; admin/driver stay utilitarian.

**Dials (customer surfaces):** VARIANCE 5 · MOTION 4 · DENSITY 4  
**Dials (admin/driver):** VARIANCE 3 · MOTION 2 · DENSITY 6

## Stack

- React + Vite + JavaScript
- Tailwind CSS
- React Router
- Lucide React
- Axios API client
- TanStack Query for server state
- Framer Motion sparingly (page transitions / confirmation success)

## Structure

See master prompt `client/src` layout. Single SPA; role-based route trees.

## State

| Concern | Approach |
|---------|----------|
| Auth session | lightweight store + memory/localStorage for tokens |
| Server lists/details | TanStack Query |
| Seat selection / hold timer | local component state + hold expiry countdown |
| Checkout draft | route state / query cache |

Avoid heavy global state libraries.

## API layer

`services/api.js` — Axios instance with interceptors (attach access token; refresh once on 401).

Domain services: `authService`, `rideService`, `bookingService`, `paymentService`, `driverService`, `adminService`.

## UX principles

- Customer: search → rides → seats → pay → confirm
- Driver: today’s trip first
- Admin: tables, filters, badges, metrics
- Loading skeletons, empty states, error banners on every major screen
