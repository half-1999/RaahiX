# Frontend Routing

| Path | Access | Page |
|------|--------|------|
| `/` | Public | Homepage |
| `/search` | Public | Search results |
| `/rides/:rideId` | Public | Ride details + seats |
| `/login` | Public | Login |
| `/register` | Public | Register |
| `/checkout` | CUSTOMER | Checkout |
| `/booking/:bookingId` | CUSTOMER | Booking details |
| `/booking-success` | CUSTOMER | Confirmation |
| `/my-bookings` | CUSTOMER | List |
| `/profile` | Authenticated | Profile |
| `/driver` | DRIVER | Dashboard |
| `/driver/rides` | DRIVER | Rides |
| `/driver/rides/:rideId` | DRIVER | Ride detail |
| `/driver/rides/:rideId/passengers` | DRIVER | Passengers |
| `/admin` | ADMIN | Dashboard |
| `/admin/users` | ADMIN | Users |
| `/admin/drivers` | ADMIN | Drivers |
| `/admin/vehicles` | ADMIN | Vehicles |
| `/admin/routes` | ADMIN | Routes |
| `/admin/rides` | ADMIN | Rides |
| `/admin/bookings` | ADMIN | Bookings |
| `/admin/payments` | ADMIN | Payments |
| `/admin/reports` | ADMIN | Reports |
| `/admin/audit-logs` | ADMIN | Audit logs |

## Guards

- `ProtectedRoute` — requires auth
- `RoleRoute` — requires role(s)
- Redirect unauthorized users to `/login` or role home
- Backend remains authoritative
