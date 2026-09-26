# System Architecture

## Overview

```text
React (Vite) SPA
      │  HTTPS / REST (JSON)
      ▼
Express API (single process)
      │
      ├── Controllers (thin)
      ├── Services (business logic)
      ├── Mongoose Models
      └── MongoDB
```

Optional external systems (MVP):

```text
Payment Gateway (create order / verify / webhook)
Email Provider (transactional email)
WhatsApp (client-side deep link only)
```

## Principles

1. **One backend application** — modular Express, not microservices.
2. **Ride + Seat Inventory** is the operational core.
3. **Server is source of truth** for seats, prices, payment state.
4. **Lean** — no Redis/GraphQL/event bus unless a hard requirement appears.
5. **Role-based access** enforced in middleware on every protected route.

## Deployment topology (MVP)

```text
Browser → Static client (or Vite preview / CDN)
       → API server (Node)
       → MongoDB Atlas or self-hosted MongoDB
```

## Trust boundaries

| Boundary | Rule |
|----------|------|
| Browser → API | Authenticated requests carry JWT; never trust role from body |
| Client payment UI → API | Success only after server verify + webhook/signature |
| Webhook → API | Signature verification; idempotent handlers |
| Services → Providers | Secrets from env only |

## High-level modules

| Module | Responsibility |
|--------|----------------|
| Auth | Register/login/refresh/logout/me |
| Admin Ops | Drivers, vehicles, routes, rides, users |
| Ride Search | Public/customer search + seat map read |
| Booking | Hold, create, cancel, list |
| Payment | Orders, verify, webhook, confirm |
| Notification | Email + WhatsApp link generation; logs |
| Driver | Assigned rides, passengers, status |
| Admin Reports | Metrics, revenue/bookings/rides, audit |
| Jobs | Expired hold release |

## Data flow (happy path)

```text
Admin creates Route + Ride (seats AVAILABLE)
Customer searches → selects seats → HOLD (atomic)
Customer creates Booking (PENDING) + Payment order
Customer pays at gateway
API verifies / webhook → Payment SUCCESS → Booking CONFIRMED → seats BOOKED
NotificationService sends email; client offers WhatsApp action
Driver reads passengers; Admin sees booking/payment
```

## Consistency notes

- Hold duration: **10 minutes**
- Seat lifecycle: AVAILABLE → HELD → BOOKED (or HELD → AVAILABLE on expiry/release)
- Booking confirmation is **idempotent**
- Notification failure never reverts booking
