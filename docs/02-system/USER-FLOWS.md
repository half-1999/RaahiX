# User Flows

## Customer booking flow

```text
Homepage
  → Search (origin, destination, date, passengers)
  → Available Rides list
  → Ride Details + Seat Map
  → Select seats → POST /bookings/hold
  → Passenger Details
  → Checkout (create booking + payment order)
  → Payment Gateway UI
  → Verify / Webhook on server
  → Booking Confirmation page
  → Email sent; WhatsApp action button
```

## Customer account flows

- Register / Login / Refresh session / Logout
- My Bookings → Booking Details
- Cancel booking (if policy allows)
- Profile update

## Driver flow

```text
Login → Driver Dashboard (today’s rides)
  → Ride Details
  → Passenger List + Seats
  → Update status: SCHEDULED → BOARDING → STARTED → COMPLETED
```

## Admin flow

```text
Login → Dashboard metrics
  → Drivers / Vehicles / Routes / Rides CRUD
  → Create Ride (route + driver + vehicle + price + seats)
  → Bookings / Payments browse
  → Cancel ride (explicit)
  → Reports + Audit Logs
```

## Failure paths

| Situation | UX / System |
|-----------|-------------|
| Seat taken during hold | Error `SEAT_UNAVAILABLE`; refresh map |
| Hold expired | `SEAT_HOLD_EXPIRED`; restart selection |
| Payment failed | Booking stays PENDING/EXPIRED path; seats released per rules |
| Payment success, email fail | Booking CONFIRMED; notification FAILED |
| Unauthorized role | 403 page / API error |
| Session expired | Refresh token; else re-login |
