# Audit Logging

## When to write

Admin actions that change operational truth:

- Driver create/update/verify/status
- Vehicle create/update
- Route create/update
- Ride create/update/cancel/driver reassignment
- User status change
- Booking cancel by admin
- Manual payment status corrections (if any)

## Record shape

See AuditLog collection. Example:

```text
action: RIDE_DRIVER_CHANGED
entityType: Ride
entityId: ...
oldValue: { driverId, driverName }
newValue: { driverId, driverName }
actorId, actorRole: ADMIN
```

## Retention

MVP: keep indefinitely in MongoDB; no PII beyond operational fields already stored.

## Access

`GET /api/admin/audit-logs` only.
