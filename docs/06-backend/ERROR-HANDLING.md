# Error Handling

## AppError

```text
message, code, statusCode, errors[]
```

Throw from services; error middleware maps to JSON envelope.

## Validation errors

Aggregate field errors into `errors: [{ field, message }]`, code `VALIDATION_ERROR`, status 400.

## Unexpected errors

Log full error server-side; client receives `INTERNAL_ERROR` + generic message.

## Domain mapping examples

| Situation | Code | HTTP |
|-----------|------|------|
| Bad password | AUTH_INVALID_CREDENTIALS | 401 |
| Customer hits admin | AUTH_FORBIDDEN | 403 |
| Seat race lost | SEAT_UNAVAILABLE | 409 |
| Hold timed out | SEAT_HOLD_EXPIRED | 400 |
| Bad payment signature | PAYMENT_INVALID | 400 |
| Duplicate webhook success | PAYMENT_ALREADY_PROCESSED | 200 (idempotent) |

## Controllers

Use `asyncHandler` — no try/catch sprawl; forward to middleware.
