# State Machines

## Seat status

```text
AVAILABLE ──hold──► HELD ──payment confirm──► BOOKED
              │
              └──expire/release/cancel──► AVAILABLE

AVAILABLE/HELD ──admin block──► BLOCKED
BLOCKED ──admin unblock──► AVAILABLE
```

Rules:
- Only AVAILABLE can be held.
- Only holder (valid `holdId` + user + not expired) can convert to BOOKED.
- BOOKED seats release only via cancellation/refund workflow.

## Ride status

```text
SCHEDULED → BOARDING → STARTED → COMPLETED
    │
    └──► CANCELLED (admin; from SCHEDULED/BOARDING typically)
```

- Bookable only when `SCHEDULED` (and seats available, departure valid).
- Driver advances status for **assigned** rides only.
- Cancelled rides are not searchable as bookable.

## Booking status

```text
PENDING ──payment success──► CONFIRMED
   │
   ├──cancel──► CANCELLED
   └──hold/payment timeout──► EXPIRED
CONFIRMED ──cancel (policy)──► CANCELLED
```

## Payment status

```text
CREATED → PENDING → SUCCESS
                 └→ FAILED
SUCCESS → REFUNDED (partial/full tracked via refundAmount)
```

Confirmation path must be **idempotent**: repeated SUCCESS events do not re-book seats or duplicate payments.

## Driver verification / status

```text
verificationStatus: PENDING | VERIFIED | REJECTED
status: ACTIVE | INACTIVE | SUSPENDED
```

Only ACTIVE + VERIFIED (recommended for assignment) drivers should be assignable to new rides; MVP enforces ACTIVE at minimum.

## User status

```text
ACTIVE | INACTIVE | BLOCKED
```

Inactive/blocked users cannot authenticate successfully for protected actions.
