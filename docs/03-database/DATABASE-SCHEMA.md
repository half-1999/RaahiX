# Database Schema

## Collections

1. `users`
2. `drivers`
3. `vehicles`
4. `routes`
5. `rides`
6. `bookings`
7. `payments`
8. `notifications`
9. `auditlogs`

No additional collections in MVP.

## Shared conventions

- `_id`: ObjectId
- `createdAt` / `updatedAt`: via Mongoose timestamps (except Notification/AuditLog may omit `updatedAt` where immutable)
- Money: store `amount` as Number (INR major units for MVP clarity) + `currency: 'INR'`
- Enums as uppercase strings matching docs
- Soft operational deletes via `status` / `CANCELLED` rather than hard delete of booked entities

## Field definitions

See [COLLECTIONS.md](./COLLECTIONS.md) for full field lists matching models User, Driver, Vehicle, Route, Ride, Booking, Payment, Notification, AuditLog.

## Critical embedded types

### Ride.seats[]

```text
seatNumber, status, holdId?, holdExpiresAt?, holdUserId?, bookingId?
```

### Vehicle.seatConfiguration[] / mirrored onto Ride at creation

```text
seatNumber, row, position
```

### Booking.passengers[]

```text
name, phone, age, seatNumber
```

### Route.origin / destination / stops

```text
city, state (+ stops: name, sequence)
```

## Integrity rules (application-enforced)

- Ride.totalSeats == vehicle.capacity == seatConfiguration.length
- Ride.availableSeats == count of seats with status AVAILABLE (maintained on mutations)
- Booking.totalAmount == amountPerSeat * passengerCount (server-calculated)
- Payment.bookingId unique success path per booking (idempotent)
