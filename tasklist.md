# RaahiX implementation task list

Status: **approved**. Tasks run in order. Each task is verified, then marked done here, before the next one starts.

Source of truth: `README.md`. Each task is done in order, verified, then marked here before the next task starts.

Rules for every task:

- Drivers operate their own rides. Admin is the control tower.
- No live GPS, no automatic dispatch, no online payment gateway as the product path.
- Seat inventory is segment-aware and enforced atomically on the server.
- Payment proof submission does not confirm a booking. Driver approval does.
- Do not invent KYC document types beyond the existing `licenseNumber`.
- After each task: run the relevant tests or API checks, then update this file.

Legend: `pending` | `in progress` | `done` | `blocked`

---

## 1. Driver verification gate

**Status:** done

Verified: pending, rejected, and suspended drivers are rejected on ride assignment (`DRIVER_NOT_VERIFIED` / `DRIVER_SUSPENDED`). A verified active driver can be assigned. Suspending a driver leaves the existing ride in place. `npm test` passed.

Only a verified, non-suspended driver can publish a ride. Admin verifies, rejects, or suspends. Suspension does not mass-cancel existing rides or delete booking history.

**Verify**

- Pending, rejected, and suspended drivers cannot create or publish a ride.
- A verified active driver can.
- Existing rides and bookings remain after suspension.

---

## 2. Driver vehicle management

**Status:** done

Verified: a driver can add and edit more than one vehicle, another driver is forbidden, capacity above 6 is rejected, a vehicle with a future ride cannot be deleted, and deactivation keeps the vehicle record. Admin vehicle list still works. `npm test` passed.

A driver can add, edit, and deactivate multiple vehicles. Capacity is at most 6. Deactivation is used instead of deletion when the vehicle has rides. Historical bookings keep their vehicle.

**Verify**

- Driver A cannot edit Driver B’s vehicle.
- Capacity above 6 is rejected.
- A vehicle with future rides cannot be hard-deleted.
- Admin can still view and manage vehicles.

---

## 3. Locations and driver-created routes

**Status:** done

Verified: a driver can create Richha → Delhi → Noida → Gurugram and a shorter route. " richha " and "Richha." resolve to the same location. An admin alias (`Gurgaon` → Gurugram) is reused instead of creating a second place. `npm test` passed.

Drivers create routes and ordered stops. Places are normalized (`name`, `normalizedName`, `city`, `state`, aliases) so the same place is not stored under multiple spellings. This is not a map or GIS feature.

**Verify**

- Two spellings of the same place resolve to one location.
- A driver can create Richha → Delhi → Noida → Gurugram and a shorter subset route.
- Admin can view and correct routes and locations.

---

## 4. Driver ride operations and lifecycle

**Status:** done

Verified: a verified driver can create a draft, then move it `PUBLISHED` → `ACTIVE` → `COMPLETED`. `COMPLETED` → `PUBLISHED` and `CANCELLED` → `ACTIVE` are rejected. Capacity 4 is rejected when 5 seats are already booked. A pending driver cannot create a ride. Existing `SCHEDULED` rides remain bookable. `npm test` passed (16 tests).

The driver dashboard is operational: create, edit, publish, cancel, start, and complete a ride on one of that driver’s vehicles.

Target states: `DRAFT` → `PUBLISHED` → `ACTIVE` → `COMPLETED`, with `CANCELLED` terminal. Reject `COMPLETED` → `PUBLISHED` and `CANCELLED` → `ACTIVE`.

`ride.capacity <= vehicle.seatCapacity`. Capacity cannot drop below seats already committed.

**Verify**

- Unverified driver cannot publish.
- Invalid transitions are rejected.
- Capacity 4 is rejected when 5 seats are already committed.
- Driver can view passengers and contact them where the app already supports contact.

---

## 5. Multi-stop rides and valid segments

**Status:** done

Verified: a published four-stop ride stores ordered stops with pickup and drop flags. Search for Delhi → Noida finds that ride. A hold for Richha → Noida succeeds. Noida → Delhi and pickup = drop return `INVALID_SEGMENT`. `npm test` passed (17 tests).

A published ride has ordered stops with location, sequence, pickup allowed, drop allowed, and optional estimated time. Customers can book any forward segment. Pickup must not equal drop. Drop must not occur before pickup.

**Verify**

- Richha → Noida is valid on a four-stop ride.
- Noida → Delhi is rejected.
- Pickup = drop is rejected.

---

## 6. Segment-aware inventory and atomic 10-minute hold

**Status:** done

Verified on a 6-seat ride. Holds are atomic and expire after 10 minutes.

Richha → Delhi (2) and Delhi → Gurugram (2) do not overlap, so each of those legs stays at 4. Adding Richha → Noida (2) then leaves Richha → Delhi at 2, Delhi → Noida at 2, and Noida → Gurugram at 4. Two simultaneous requests for 4 seats when 6 remain produce one success and one rejection. Expiry releases the hold. `npm test` passed (19 tests).

Availability is calculated from overlapping segments, not from one ride-wide `availableSeats` counter. A booking occupies only the segments between its pickup and drop.

Hold is 10 minutes, stored with `holdExpiresAt`, and applied in one atomic backend update. Concurrent requests must not both consume the same segment capacity.

```text
active HELD + CONFIRMED + other committed inventory <= capacity
```

for every affected segment.

**Verify**

- Richha → Delhi (2) and Delhi → Gurugram (2) on a 6-seat vehicle leave Richha → Delhi at 4, Delhi → Noida at 2, and Noida → Gurugram at 4.
- Two simultaneous requests for 4 seats when only 6 remain: only one succeeds.
- Hold expiry releases inventory.
- A frontend-only check is not the enforcement point.

---

## 7. Direct driver payment and proof review

**Status:** done

Verified: a missing screenshot is rejected. Submission leaves the booking `PENDING`. Driver approval confirms it. Rejection cancels it and releases the seats. A review after the hold expires returns 409 and does not confirm. Another driver receives 403. `npm test` passed.

Remove gateway confirmation from the booking path. The customer pays the driver using the driver’s UPI ID, QR, and payment instructions, then uploads a mandatory screenshot.

Payment states: `NOT_SUBMITTED` → `SUBMITTED` → `APPROVED` or `REJECTED`. Only approval sets the booking to `CONFIRMED`. Rejection cancels the booking and releases seats.

Store who submitted the proof, which booking, when, amount, file, status, reviewer, review time, and rejection reason. Screenshots are not publicly readable; only the customer, that ride’s driver, and admin can access them.

If the hold expires before approval, do not auto-confirm. A later manual resolution must re-check segment capacity.

**Verify**

- Submit without a screenshot is rejected.
- Submit does not set `CONFIRMED`.
- Driver approval confirms and keeps the seats.
- Driver rejection releases the seats.
- Proof submitted at 14:09 on a hold that expires at 14:10 is not confirmed by a review at 14:12.
- Another driver cannot review the payment.

---

## 8. Cancellation and manual refunds

**Status:** done

Verified: more than 24 hours records 100%, 6–24 hours records 50%, under 6 hours records 0%, and a started trip calculates 0%. Driver ride cancellation keeps the booking and records 100% for a confirmed booking. No payment payout document is created. Admin can set refund status only with a reason. `npm test` passed.

| Timing | Refund obligation |
| --- | ---: |
| More than 24 hours before departure | 100% |
| 6–24 hours before departure | 50% |
| Less than 6 hours before departure | 0% |
| After the trip starts | 0% |
| Driver or admin cancels the ride | 100% |

The platform records `refundAmount`, `refundStatus` (`NOT_APPLICABLE`, `PENDING`, `PARTIAL`, `COMPLETED`, `WAIVED`), `refundProcessedAt`, `refundProcessedBy`, and `refundReference`. It does not send the money. Admin can override refund status. Driver or admin ride cancellation cancels affected confirmed bookings at 100% obligation and preserves history.

**Verify**

- Each timing row produces the obligation above.
- No automatic payout is created.
- Admin can set refund status and the change is stored.
- Ride cancellation does not delete booking history.

---

## 9. Audit reasons and admin overrides

**Status:** done

Verified: a refund update without a reason is rejected. The audit entry stores the old status, the new status, and the reason. Driver suspension also requires a reason. `npm test` passed.

Important admin changes write an audit record: actor, role, action, entity type, entity id, old value, new value, reason, and timestamp.

Cover booking status, payment status, refund changes, ride cancellation, capacity overrides, driver verification, driver suspension, and important customer or driver edits. Require a reason on these overrides.

**Verify**

- An override without a reason is rejected.
- The audit entry contains the old value, new value, and reason.
- Admin can still confirm, reject, cancel, and correct payment or refund status when operations require it.

---

## 10. Notifications

**Status:** done

Verified: booking created, payment submitted, payment approved, and upcoming ride each create an in-app record for the correct user. A forced email failure is stored as `FAILED` and the booking stays `CONFIRMED`. `npm test` passed.

Customer: booking created, payment submitted, payment approved, payment rejected, booking confirmed, booking cancelled, ride cancelled, refund status updated.

Driver: new booking, payment submitted, booking cancellation, upcoming ride, ride cancellation.

Use the existing email path and WhatsApp deep link. Add an in-app notification record the user can read. Do not add a message bus or WhatsApp Business API.

**Verify**

- Each event creates a notification for the correct user.
- A failed email does not roll back the booking or payment decision.

---

## 11. Customer and driver screens

**Status:** done

Customer checkout uploads a screenshot instead of opening a gateway. My Bookings splits into Upcoming, Active, Completed, and Cancelled. Booking detail shows proof and refund status. Driver screens cover vehicles, routes, and payment review. Admin bookings show proof and refund. Alerts are listed at `/notifications`. Role routes are unchanged.

Customer: search by segment, choose pickup and drop, see segment availability, book multiple seats and passengers, see driver, vehicle, payment status, booking status, and refund status. My Bookings splits into Upcoming, Active, Completed, and Cancelled.

Driver: operational screens for vehicles, payment details, routes, rides, bookings, payment review, and trip start/complete.

Admin screens keep full visibility, including refunds and audit logs.

**Verify**

- Walk the customer path from search through proof upload in the browser.
- Walk driver approve and reject.
- Confirm role guards still block the wrong role.

---

## 12. Seed, environment, and tests

**Status:** done

Seed adds Richha → Delhi → Noida → Gurugram on a verified driver’s 6-seat vehicle, with UPI details and one confirmed Richha → Delhi segment booking. Gateway keys are not required to start the API. `npm test` passed (22 tests), including the inventory, payment, refund, audit, and notification cases.

Seed the Richha → Delhi → Noida → Gurugram corridor with verified drivers, vehicles of at most 6 seats, and sample segment bookings. Stop treating gateway keys as required for the booking path.

Add tests before calling the inventory work done:

- Segment capacity and overlapping bookings
- Concurrent holds
- Hold expiry and inventory release
- One seat, multiple seats, multiple passengers
- Valid and invalid segments
- Payment submit, approve, reject, and post-expiry review
- Refund obligation rows
- Customer cannot manage another customer’s booking
- Driver cannot manage another driver’s ride or payment
- Unverified driver cannot publish
- Admin override writes an audit record
- Ride draft, publish, start, complete, cancel, and illegal reverse transitions

**Verify**

- `npm test` passes.
- The changed customer and driver flows work in the running app.

---

## 13. README status update

**Status:** done

`README.md` now describes the verified driver lifecycle, segment holds, direct payment review, refund table, audit reasons, and in-app notifications as implemented. Gateway callbacks are documented as existing code that does not confirm a booking.

---

## Out of scope

Live GPS, driver tracking, automatic assignment, instant taxi booking, dynamic pricing, payment gateways, wallets, subscriptions, coupons, AI matching, route optimization, navigation, multi-country payments, microservices, and a new event platform.
