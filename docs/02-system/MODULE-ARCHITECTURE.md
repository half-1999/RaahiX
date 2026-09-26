# Module Architecture

## Backend modules (`server/src`)

| Folder | Role |
|--------|------|
| `config/` | Env, DB, CORS, payment/email config |
| `constants/` | Roles, statuses, error codes |
| `models/` | Mongoose schemas |
| `validators/` | Request validation schemas |
| `middleware/` | auth, authorize, validate, rateLimit, errorHandler |
| `services/` | Business logic |
| `controllers/` | HTTP ↔ service adapters |
| `routes/` | Route mounting by domain |
| `jobs/` | Hold expiry sweeper |
| `utils/` | logger, AppError, tokens, asyncHandler |

## Service map

```text
AuthService
UserService (admin user ops)
DriverService
VehicleService
RouteService
RideService          ← schedule + search + seat reads
SeatService          ← hold / release / book (atomic)
BookingService
PaymentService       ← gateway abstraction
NotificationService
AuditService
ReportService
DriverOpsService     ← driver-facing ride/passenger/status
```

## Frontend modules (`client/src`)

| Area | Contents |
|------|----------|
| `pages/public` | Home, Search, Ride, Login, Register |
| `pages/customer` | Checkout, Booking, Success, MyBookings, Profile |
| `pages/driver` | Dashboard, Rides, Ride detail, Passengers |
| `pages/admin` | Ops dashboards for all entities + reports |
| `components/booking|rides|seats|ui|layout` | Reusable UI |
| `services/` | API client wrappers |
| `hooks/` | Auth, booking hold timer, queries |
| `store/` | Minimal auth session state |
| `routes/` | Router + role guards |

## Dependency direction

```text
UI pages → hooks/services → REST API
controllers → services → models
jobs → services
```

No circular service dependencies; PaymentService may call BookingService confirm methods via a narrow confirm path to keep idempotency centralized.
