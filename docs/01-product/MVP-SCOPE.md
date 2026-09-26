# MVP Scope

## In scope

### Product surfaces
- One React SPA with role-based UI: Customer, Driver, Admin
- Public: homepage, search, ride details, login, register
- Customer: seat selection, hold, checkout, payment, my bookings, profile, cancel
- Driver: dashboard, rides, passengers, trip status
- Admin: users, drivers, vehicles, routes, rides, bookings, payments, reports, audit logs

### Backend
- Express REST API, Mongoose models, service layer
- JWT access + refresh tokens
- Seat hold (10 minutes) with concurrency control
- Razorpay (or configured gateway) via PaymentService abstraction
- Email notifications + WhatsApp prefilled link
- Audit logging for admin mutations
- Seed script + automated tests for critical paths

### Data
Collections: User, Driver, Vehicle, Route, Ride, Booking, Payment, Notification, AuditLog

## Explicitly out of scope

Listed in [FUTURE-SCOPE.md](./FUTURE-SCOPE.md). Do not implement in MVP.

## Acceptance gate

MVP is done only when Definition of Done and Critical Acceptance Tests in the master prompt pass (admin → customer book → driver see → admin see; concurrency + webhook idempotency + authz).

## Constraints

- No microservices, GraphQL, Redis, Kubernetes, native apps
- No hardcoded routes/cities in business logic
- No trusting client seat availability or payment success
- Documentation stays in sync with implementation
