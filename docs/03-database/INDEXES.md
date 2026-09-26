# Indexes

## Design principles

- Index fields used in equality/range filters and unique constraints.
- Prefer compound indexes that match real query shapes.
- Do not index every field (write amplification, storage).

## User

| Index | Reason |
|-------|--------|
| `{ email: 1 }` unique | Login / register uniqueness |
| `{ phone: 1 }` unique | Uniqueness + lookup |
| `{ role: 1, status: 1 }` | Admin user lists by role |

## Driver

| Index | Reason |
|-------|--------|
| `{ userId: 1 }` unique | 1:1 with user |
| `{ licenseNumber: 1 }` unique | Uniqueness |
| `{ status: 1, verificationStatus: 1 }` | Admin filters / assignment |

## Vehicle

| Index | Reason |
|-------|--------|
| `{ registrationNumber: 1 }` unique | Uniqueness |
| `{ driverId: 1 }` | List vehicles for driver |
| `{ status: 1 }` | Active vehicles |

## Route

| Index | Reason |
|-------|--------|
| `{ 'origin.city': 1, 'destination.city': 1, status: 1 }` | Search suggestions / admin |
| `{ status: 1 }` | Active routes |

## Ride

| Index | Reason |
|-------|--------|
| `{ date: 1, status: 1 }` | Daily ops / search |
| `{ routeId: 1, date: 1, status: 1 }` | Primary customer search |
| `{ driverId: 1, date: 1 }` | Driver dashboard |
| `{ status: 1, departureTime: 1 }` | Upcoming scheduled |

Seat subdocument fields are not separately indexed; seat ops load ride by `_id` and update atomically with arrayFilters.

Optional future: `{ 'seats.holdExpiresAt': 1 }` if expiry scans become heavy — MVP uses ride-level job queries cautiously.

## Booking

| Index | Reason |
|-------|--------|
| `{ bookingNumber: 1 }` unique | Lookup |
| `{ userId: 1, createdAt: -1 }` | My bookings |
| `{ rideId: 1 }` | Passengers for ride |
| `{ bookingStatus: 1, paymentStatus: 1 }` | Admin filters |
| `{ holdExpiresAt: 1 }` sparse | Expire pending holds |

## Payment

| Index | Reason |
|-------|--------|
| `{ bookingId: 1 }` | Payment for booking |
| `{ gatewayOrderId: 1 }` unique sparse | Idempotent order lookup |
| `{ gatewayPaymentId: 1 }` unique sparse | Idempotent payment lookup |
| `{ status: 1, createdAt: -1 }` | Admin lists |

## Notification

| Index | Reason |
|-------|--------|
| `{ userId: 1, createdAt: -1 }` | User history |
| `{ bookingId: 1 }` | Booking-related |
| `{ status: 1 }` | Retry/ops (light) |

## AuditLog

| Index | Reason |
|-------|--------|
| `{ createdAt: -1 }` | Recent logs |
| `{ entityType: 1, entityId: 1 }` | Entity history |
| `{ actorId: 1, createdAt: -1 }` | Actor history |
