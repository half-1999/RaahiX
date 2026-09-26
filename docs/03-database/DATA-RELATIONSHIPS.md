# Data Relationships

```text
User 1──1 Driver (when role=DRIVER)
Driver 1──* Vehicle
Route 1──* Ride
Driver 1──* Ride
Vehicle 1──* Ride
User 1──* Booking
Ride 1──* Booking
Booking 1──* Payment (typically 1 success path; retries may create failed attempts)
User 1──* Notification
Booking 1──* Notification
User (actor) 1──* AuditLog
```

## Ownership rules

| Entity | Owner / access |
|--------|----------------|
| Booking | Owning customer; admin read; driver read via assigned ride |
| Ride seats | Mutated only by Booking/Payment/Admin services |
| Payment | Owning user + admin; never driver write |
| Driver profile | Admin write; linked User for auth |

## Cascade / soft rules

- Deleting a ride with bookings is forbidden → **Cancel Ride**.
- Cancelling a booking releases seats if not completed trip constraints apply (see cancellation policy).
- Driver deactivation does not delete historical rides/bookings.
- User BLOCKED prevents new auth; historical bookings remain for admin.

## Seat inventory ownership

Seat documents live **embedded on Ride**. Booking references `selectedSeats` and `bookingId` is written onto seat rows at confirmation. This keeps inventory atomic with the ride document for MVP concurrency.
