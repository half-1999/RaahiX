# Authorization

## Role matrix (summary)

| Resource | CUSTOMER | DRIVER | ADMIN |
|----------|----------|--------|-------|
| Search rides | ✓ | ✓ | ✓ |
| Hold/book/pay | ✓ own | ✗ | ✗ (admin manages via admin APIs) |
| Own bookings | ✓ | ✗ | ✓ all |
| Driver rides | ✗ | ✓ assigned | ✓ all |
| Admin CRUD | ✗ | ✗ | ✓ |

## Enforcement

1. `authenticate` middleware attaches `req.user`
2. `authorize(...roles)` checks role
3. Resource ownership checks in services (booking.userId, ride.driverId)

## Frontend

RoleRoute guards improve UX only — never sole control.

## Privilege escalation

Clients cannot set `role` on register/profile update. Admin-only endpoints create DRIVER users.
