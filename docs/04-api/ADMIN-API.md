# Admin API

All endpoints require **Bearer** + role **ADMIN** unless noted.

## Dashboard

### GET /api/admin/dashboard

- **Success 200:** `{ users, drivers, ridesToday, bookingsToday, revenueToday, pendingPayments }`

## Users

| Method | URL | Notes |
|--------|-----|-------|
| GET | `/api/admin/users` | Query: role, status, search |
| GET | `/api/admin/users/:id` | Detail |
| PATCH | `/api/admin/users/:id/status` | Body `{ status }` ACTIVE/INACTIVE/BLOCKED; audit |

## Drivers

| Method | URL | Body / notes |
|--------|-----|--------------|
| GET | `/api/admin/drivers` | filters |
| POST | `/api/admin/drivers` | create user+driver or link; license, phone, name |
| GET | `/api/admin/drivers/:id` | |
| PATCH | `/api/admin/drivers/:id` | edit, verificationStatus, status; audit |

## Vehicles

| Method | URL | Notes |
|--------|-----|-------|
| GET | `/api/admin/vehicles` | |
| POST | `/api/admin/vehicles` | seatConfiguration required; capacity must match length |
| GET | `/api/admin/vehicles/:id` | |
| PATCH | `/api/admin/vehicles/:id` | |

## Routes

| Method | URL | Notes |
|--------|-----|-------|
| GET | `/api/admin/routes` | |
| POST | `/api/admin/routes` | origin, destination, stops, duration |
| PATCH | `/api/admin/routes/:id` | |

## Rides

| Method | URL | Notes |
|--------|-----|-------|
| GET | `/api/admin/rides` | filters date/status/route |
| POST | `/api/admin/rides` | routeId, driverId, vehicleId, times, price; init seats from vehicle |
| GET | `/api/admin/rides/:id` | |
| PATCH | `/api/admin/rides/:id` | permitted fields; driver change audited |
| DELETE | `/api/admin/rides/:id` | **soft cancel** if bookings exist — prefer cancel endpoint behavior; hard delete only if no bookings |

Recommended: `PATCH` with `{ status: 'CANCELLED' }` triggers cancellation workflow rather than destructive delete.

## Bookings / Payments

| Method | URL |
|--------|-----|
| GET | `/api/admin/bookings` |
| GET | `/api/admin/bookings/:id` |
| GET | `/api/admin/payments` |
| GET | `/api/admin/payments/:id` |

## Reports

| Method | URL | Query |
|--------|-----|-------|
| GET | `/api/admin/reports/revenue` | from, to |
| GET | `/api/admin/reports/bookings` | from, to, status |
| GET | `/api/admin/reports/rides` | from, to, status |

## Audit

### GET /api/admin/audit-logs

- Query: `entityType`, `entityId`, `actorId`, `from`, `to`, pagination
- Success: list of audit entries

## Validation & errors

- 400 VALIDATION_ERROR for bad payloads
- 404 entity not found codes
- 409 conflicts (duplicate registration, capacity mismatch)
- All mutating admin actions write AuditLog where specified in [AUDIT-LOGGING.md](../09-operations/AUDIT-LOGGING.md)
