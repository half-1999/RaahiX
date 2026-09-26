# Product Requirements Document (PRD)

## Product overview

**Local Scheduled Shared-Cab Booking Platform** is a MERN MVP for booking individual seats on pre-scheduled cab rides. Operators publish routes and timed rides; customers search, hold seats, pay online, and receive confirmation. Drivers see assigned passengers; admins manage operations.

This is **not** a real-time taxi-hailing product (no Uber/Ola-style dispatch).

**Central business object:** Ride + Seat Inventory.

## Problem

Intercity and local shared-cab operators rely on phone/WhatsApp bookings, spreadsheets, and informal seat tracking. Double-booking, unclear inventory, and weak payment confirmation cause operational friction and lost revenue.

## Goals

1. Let admins schedule rides with seat-level inventory.
2. Let customers search routes/dates, hold seats, pay, and confirm bookings.
3. Let drivers see today’s assigned rides and passenger/seat lists.
4. Enforce seat concurrency safely on the server.
5. Deliver a lean, deployable MVP for Delhi NCR / Gurugram / Bareilly / Uttarakhand scale (~20 drivers, ~30 customers initially).

## Non-goals (MVP)

- Real-time GPS / live tracking
- Driver bidding or matching algorithms
- Surge pricing, wallets, loyalty, referrals
- In-app chat / voice calling
- Native mobile apps
- Complex route optimization
- Microservices, GraphQL, Redis (unless required later), event-driven architecture
- WhatsApp Business API (prefilled deep link only)
- Full map platform

See [FUTURE-SCOPE.md](./FUTURE-SCOPE.md).

## Users

| Persona | Need |
|---------|------|
| Customer | Find scheduled rides, book seats, pay, manage bookings |
| Driver | See assigned trips, passengers, seats, update trip status |
| Admin/Operator | Manage drivers, vehicles, routes, rides, bookings, payments, reports |

## Roles

```text
CUSTOMER | DRIVER | ADMIN
```

Backend enforces authorization; frontend route guards are secondary.

## Core workflows

### Customer

Homepage → Search → Available rides → Ride details → Seat selection → Temporary hold (10 min) → Passenger details → Checkout → Payment → Server verification/webhook → Booking confirmation → Email + WhatsApp action.

Also: Login, Register, My Bookings, Booking Details, Profile, Cancellation.

### Driver

Login → Dashboard → Today’s rides → Ride details → Passenger list → Seat info → Trip status (`SCHEDULED` → `BOARDING` → `STARTED` → `COMPLETED`).

### Admin

Login → Dashboard → Drivers, Vehicles, Routes, Rides, Bookings, Payments, Users, Reports, Audit Logs.

## Functional requirements

1. Auth: register, login, refresh, logout, me; JWT access + refresh; bcrypt passwords.
2. Admin CRUD for drivers, vehicles, routes, rides (assign driver/vehicle).
3. Customer ride search by origin, destination, date, passenger count.
4. Data-driven seat maps from vehicle / ride seat configuration (no hardcoded layouts in React).
5. Atomic seat hold → book after verified payment; hold expiry releases seats.
6. Server-side price calculation; never trust client amounts.
7. Payment order create, verify, webhook; idempotent confirmation.
8. Email confirmation (provider-backed); WhatsApp prefilled action.
9. Cancellation with booking state updates; refund status tracked separately.
10. Audit logs for important admin mutations.
11. Basic admin reports (revenue, bookings, rides).
12. Seed data for local development.

## Non-functional requirements

- Responsive web (customer mobile-first; driver mobile-priority; admin desktop-priority).
- Consistent API envelope and centralized error codes.
- Input validation, rate limiting on sensitive endpoints, Helmet, CORS, sanitized errors.
- Structured logging of business events without secrets.
- MongoDB indexes for search and booking hot paths.
- Test coverage for auth, seats concurrency, booking, payment idempotency, authorization.

## MVP scope

Single React app + single Express API + MongoDB. Modular services (`Auth`, `Ride`, `Booking`, `Payment`, `Notification`). One payment gateway behind an abstraction. Email provider isolated. See [MVP-SCOPE.md](./MVP-SCOPE.md).

## Success criteria

End-to-end path works: Admin creates route/ride → Customer searches, holds seat, pays → Seat BOOKED → Driver sees passenger → Admin sees booking/payment → Duplicate webhook does not double-book → Cross-role access rejected.

## Risks

| Risk | Mitigation |
|------|------------|
| Seat race conditions | MongoDB atomic ops / transactions; hold TTL |
| Payment webhook duplication | Idempotent payment/booking confirmation |
| Hold abandonment | Job/check releasing expired holds |
| Notification failures | Never roll back confirmed booking |
| Scope creep | FUTURE-SCOPE only |

## Assumptions

- Operators create rides ahead of time; customers book seats, not hail cars.
- Payment gateway (e.g. Razorpay) available via env keys for staging/production.
- Email provider available via env keys; local/dev may log emails.
- Geography expands via Route records, not code changes.
- Currency initially INR (`currency` field present for future).
