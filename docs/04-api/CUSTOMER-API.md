# Customer API

## Rides

### GET /api/rides/search

- **Auth:** Optional (public)
- **Query:** `originCity`, `destinationCity`, `date` (YYYY-MM-DD), `passengers` (int ≥ 1)
- **Logic:** `status=SCHEDULED`, `availableSeats >= passengers`, departure not in past
- **Success 200:** `{ rides: [...] }` summary cards (id, route, times, price, availableSeats, vehicleType)
- **Errors:** 400 VALIDATION_ERROR

### GET /api/rides/:rideId

- **Auth:** Optional
- **Success 200:** ride detail + route + driver public fields + vehicle summary
- **Errors:** 404 RIDE_NOT_FOUND

### GET /api/rides/:rideId/seats

- **Auth:** Optional
- **Success 200:** `{ seats: [{ seatNumber, status, row, position }], holdMinutes: 10 }`
- **Note:** HELD seats appear unavailable to others; exact hold owner not exposed

## Bookings

### POST /api/bookings/hold

- **Auth:** Bearer
- **Role:** CUSTOMER
- **Body:** `{ rideId, seatNumbers: string[] }`
- **Validation:** seats exist, all AVAILABLE, ride SCHEDULED
- **Success 200/201:** `{ holdId, holdExpiresAt, seats, rideId }`
- **Errors:** 409 SEAT_UNAVAILABLE; 400 RIDE_NOT_AVAILABLE; 404

### POST /api/bookings

- **Auth:** CUSTOMER
- **Body:** `{ rideId, holdId, passengers: [{ name, phone, age, seatNumber }] }`
- **Server calculates:** amountPerSeat, passengerCount, totalAmount
- **Success 201:** `{ booking }` status PENDING
- **Errors:** SEAT_HOLD_INVALID, SEAT_HOLD_EXPIRED, VALIDATION_ERROR

### GET /api/bookings

- **Auth:** CUSTOMER
- **Success 200:** own bookings list

### GET /api/bookings/:bookingId

- **Auth:** CUSTOMER (owner) or ADMIN
- **Success 200:** booking detail + ride summary
- **Errors:** 404, 403

### POST /api/bookings/:bookingId/cancel

- **Auth:** CUSTOMER (owner) or ADMIN
- **Body:** `{ reason? }`
- **Success 200:** updated booking; seats released if policy allows
- **Errors:** BOOKING_NOT_CANCELLABLE, BOOKING_ALREADY_CANCELLED

## Payments

### POST /api/payments/create-order

- **Auth:** CUSTOMER
- **Body:** `{ bookingId }`
- **Success 201:** `{ paymentId, gatewayOrderId, amount, currency, keyId }` for client checkout
- **Errors:** BOOKING_NOT_FOUND, BOOKING_EXPIRED, PAYMENT_INVALID

### POST /api/payments/verify

- **Auth:** CUSTOMER
- **Body:** gateway verification payload (orderId, paymentId, signature)
- **Server:** verify signature; confirm payment + booking idempotently
- **Success 200:** `{ booking, payment }`
- **Errors:** PAYMENT_INVALID, PAYMENT_FAILED, PAYMENT_ALREADY_PROCESSED (still 200 with existing if idempotent success)

### POST /api/payments/webhook

- **Auth:** Gateway signature headers (no user JWT)
- **Body:** raw gateway event
- **Success 200:** `{ received: true }`
- **Idempotent:** duplicate events safe
