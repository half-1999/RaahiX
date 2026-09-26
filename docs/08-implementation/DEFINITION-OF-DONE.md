# Definition of Done

## End-to-end scenario

```text
ADMIN creates route → ride → assigns driver/vehicle → SCHEDULED
CUSTOMER searches → selects seat → HELD → passengers → pays
SERVER verifies → booking CONFIRMED → seats BOOKED → email + WhatsApp action
DRIVER sees passenger/seat
ADMIN sees booking + payment + inventory
```

## Critical acceptance tests

1. Admin creates Gurugram → Bareilly, 4 seats, ₹700
2. Customer search shows ride
3. Customer holds A1 → HELD
4. Second customer A1 rejected
5. First customer pays → A1 BOOKED
6. Second search shows A1 unavailable
7. Payment failure → seat available after expiry/release
8. Customer booking view correct
9. Driver sees passenger
10. Admin sees booking/payment
11. Duplicate webhook → single confirmation
12. Driver cannot access another driver’s ride
13. Customer cannot access admin API

## Quality bar

- Docs match implementation
- TASK-BREAKDOWN accurate
- No secrets in git
- Tests for auth, seats, booking, payment, authz
- Responsive major screens
- Empty/loading/error states present
