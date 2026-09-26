# API Specification

## Base URL

```text
/api
```

## Response envelope

### Success

```json
{
  "success": true,
  "message": "Ride fetched successfully",
  "data": {}
}
```

### Error

```json
{
  "success": false,
  "message": "Seat is no longer available",
  "code": "SEAT_UNAVAILABLE",
  "errors": []
}
```

Never expose stack traces.

## Authentication

- Access token: `Authorization: Bearer <accessToken>`
- Refresh: `POST /api/auth/refresh` with refresh token (body or httpOnly cookie — MVP uses JSON body `{ refreshToken }` for SPA simplicity; document cookie option for future hardening)

## Error codes (central)

```text
AUTH_INVALID_CREDENTIALS
AUTH_UNAUTHORIZED
AUTH_FORBIDDEN
AUTH_TOKEN_EXPIRED
AUTH_TOKEN_INVALID

VALIDATION_ERROR

USER_NOT_FOUND
USER_BLOCKED

RIDE_NOT_FOUND
RIDE_CANCELLED
RIDE_NOT_AVAILABLE

SEAT_NOT_FOUND
SEAT_UNAVAILABLE
SEAT_HOLD_EXPIRED
SEAT_HOLD_INVALID

BOOKING_NOT_FOUND
BOOKING_ALREADY_CANCELLED
BOOKING_NOT_CANCELLABLE
BOOKING_EXPIRED

PAYMENT_FAILED
PAYMENT_INVALID
PAYMENT_ALREADY_PROCESSED
PAYMENT_NOT_FOUND

DRIVER_NOT_FOUND
VEHICLE_NOT_FOUND
ROUTE_NOT_FOUND

INTERNAL_ERROR
```

## Endpoint index

| Area | Doc |
|------|-----|
| Auth | [AUTH-API.md](./AUTH-API.md) |
| Customer rides/bookings/payments | [CUSTOMER-API.md](./CUSTOMER-API.md) |
| Driver | [DRIVER-API.md](./DRIVER-API.md) |
| Admin | [ADMIN-API.md](./ADMIN-API.md) |

## Common status codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Validation / business rule |
| 401 | Unauthenticated |
| 403 | Forbidden role / ownership |
| 404 | Not found |
| 409 | Conflict (seat held, duplicate) |
| 429 | Rate limited |
| 500 | Unexpected server error (sanitized) |
