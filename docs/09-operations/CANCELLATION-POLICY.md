# Cancellation Policy

## Customer cancel

Allowed when:

- Booking is CONFIRMED or PENDING
- Ride status is SCHEDULED (not STARTED/COMPLETED)
- Optional: departure more than X hours away — **MVP default: cancellable until ride BOARDING/STARTED**

Effects:

1. `bookingStatus = CANCELLED`, `cancelledAt`, reason
2. If PENDING payment: release seats HOLD→AVAILABLE; payment FAILED/abandon
3. If PAID: seats BOOKED→AVAILABLE; `paymentStatus = REFUNDED` tracked (manual/ops refund outside automated gateway payout unless adapter supports it later)
4. Notify cancellation email (best effort)

## Admin cancel booking

Same seat release rules; audit log.

## Admin cancel ride

1. Ride → CANCELLED
2. All CONFIRMED/PENDING bookings for ride → cancel workflow
3. Do not hard-delete ride with booking history

## Non-cancellable

- Ride COMPLETED
- Booking already CANCELLED/EXPIRED
- After trip STARTED (MVP): `BOOKING_NOT_CANCELLABLE`
