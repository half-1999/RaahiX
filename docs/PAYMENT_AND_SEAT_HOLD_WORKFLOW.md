# Payment proof & seat-hold workflow

## Status separation

| Domain | Canonical values |
|--------|------------------|
| Ride | `SCHEDULED` → `ACTIVE` → `COMPLETED` (+ optional `voidedAt`) |
| Booking | `PENDING`, `CONFIRMED`, `EXPIRED`, `CANCELLED` |
| Proof | `NOT_SUBMITTED`, `SUBMITTED`, `APPROVED`, `REJECTED` |
| Payment | `CREATED`, `PENDING`, `SUCCESS`, `FAILED`, `REFUNDED` |

Never encode payment states on the ride status field.

## Flow A — hold without immediate payment

1. Passenger selects seats → backend atomic hold (`HOLD_DURATION_MINUTES`, default **10**).
2. Countdown is shown in the UI; **server `holdExpiresAt` is authoritative**.
3. `expireHolds` job (60s) releases expired HELD seats.
4. Expired holds cannot confirm bookings.

## Flow B — upload payment screenshot

1. Hold must still be open.
2. Screenshot validated (MIME + magic bytes, ≤2MB, PNG/JPEG/WebP).
3. Stored privately under `server/.data/proofs/` with authenticated retrieval.
4. Booking gets a public **`RAAHIX######`** `paymentReference` (atomic counter).
5. Hold is **extended** to `VERIFICATION_HOLD_MINUTES` (default **30**) on both booking and seat/segment hold — never indefinite.
6. Proof status → `SUBMITTED`; payment row `PENDING` / manual_upi.

If the verification window expires before approval:

- `expirePending` marks booking `EXPIRED` and releases seats.
- A late Approve cannot confirm an expired/released hold.

## Flow C — driver approval

1. Driver of that ride only.
2. If hold still valid → seats confirmed BOOKED, booking `CONFIRMED`, proof `APPROVED`, payment `SUCCESS`.
3. Reject → seats released, booking `CANCELLED`, proof `REJECTED`.
4. Approval is idempotent for already-confirmed bookings on the admin path.

## Refunds

Tracked on the booking (`refundAmount`, `refundStatus`, `refundReference`) linked to the original `paymentReference`. Completed refunds reduce **net collected** in ride finance summaries. Manual process — not a live bank API.

## Revenue on completed rides

`rideFinanceService.summarizeRideFinance`:

- **Gross fare** — expected from confirmed/submitted passenger fares + guests  
- **Collected** — approved/paid amounts only  
- **Outstanding** — gross − collected  
- **Refunded** — completed/partial refund amounts  
- **Net collected** — collected − refunded  

Shown on driver **My Rides** for `COMPLETED` rides and used consistently in listings.
