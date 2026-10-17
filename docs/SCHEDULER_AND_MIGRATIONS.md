# Scheduler, migrations, and deployment notes

## Ride lifecycle job

- File: `server/src/jobs/rideLifecycle.js`
- Service: `server/src/services/rideLifecycleService.js`
- Started from `server/src/server.js` when `NODE_ENV !== 'test'`
- Interval: **30 seconds** (same pattern as hold-expiry job)

### Transitions

| From | To | When |
|------|-----|------|
| SCHEDULED | ACTIVE | `departureTime <= now` and not voided |
| ACTIVE | COMPLETED | `estimatedCompletionAt <= now` (fallback: `arrivalTime`) |

Updates use conditional `findOneAndUpdate` so retries are idempotent. Manual completion sets `actualCompletedAt` and source `MANUAL`; delayed jobs cannot revive a COMPLETED ride.

### Operations

- Logs: `job.rideLifecycle`, `job.rideLifecycle_failed`
- Dev: runs automatically with `npm run dev` / `npm start` in `server`
- No extra env var required; uses process timer + MongoDB as source of truth

## Hold expiry job

Existing `expireHolds` job (60s) still releases expired seat holds and pending bookings.

## Migration: three-status backfill

- File: `server/src/scripts/migrateRideLifecycle.js`
- Runs once on server start (idempotent)
- Maps DRAFT/PUBLISHED → SCHEDULED, BOARDING/STARTED → ACTIVE, CANCELLED → COMPLETED + `voidedAt`
- Fills `estimatedDurationMinutes` / `estimatedCompletionAt` from departure/arrival when missing

No separate SQL migration tool — MongoDB schema is flexible; indexes are declared on the Ride/Location models.

## Environment

No new required variables. Optional email/WhatsApp settings already used by notifications apply to activation/completion alerts.
