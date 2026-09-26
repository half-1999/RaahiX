# User Stories

## Customer

| ID | Story | Acceptance |
|----|-------|------------|
| C1 | As a visitor, I can search rides by origin, destination, date, and passenger count | Only SCHEDULED rides with enough available seats and valid future departure appear |
| C2 | As a visitor, I can view ride details and seat availability | Seat map is data-driven; statuses shown clearly |
| C3 | As a customer, I can register and log in | JWT issued; password hashed |
| C4 | As a customer, I can select seats and hold them for 10 minutes | Concurrent hold of same seat fails for second user |
| C5 | As a customer, I can enter passenger details and create a booking from my hold | Amount calculated server-side |
| C6 | As a customer, I can pay online and get confirmation | Booking CONFIRMED only after server verification |
| C7 | As a customer, I can open a WhatsApp action after booking | Prefill message; no Business API required |
| C8 | As a customer, I can view my bookings and booking details | Own bookings only |
| C9 | As a customer, I can cancel an eligible booking | Status updates; seats released per policy |
| C10 | As a customer, I can update my profile | Name/phone updates allowed; role not self-escalatable |

## Driver

| ID | Story | Acceptance |
|----|-------|------------|
| D1 | As a driver, I can log in and see today’s assigned rides | Only own rides |
| D2 | As a driver, I can view ride details, passengers, and seats | No payment/amount mutation |
| D3 | As a driver, I can update trip status along SCHEDULED→BOARDING→STARTED→COMPLETED | Invalid transitions rejected |
| D4 | As a driver, I cannot access other drivers’ rides or admin APIs | 403 |

## Admin

| ID | Story | Acceptance |
|----|-------|------------|
| A1 | As an admin, I can create/edit/activate drivers and verify them | Audit logged |
| A2 | As an admin, I can create/edit vehicles with seat configuration | Capacity matches seat config |
| A3 | As an admin, I can create/edit routes with origin/destination/stops | No hardcoding in code |
| A4 | As an admin, I can schedule rides, assign driver/vehicle, set price/time | Seat inventory initialized from vehicle |
| A5 | As an admin, I can cancel rides (not silently delete if bookings exist) | Bookings handled per cancellation policy |
| A6 | As an admin, I can view bookings, payments, users, reports, audit logs | Filters/search available |
| A7 | As an admin, I can change user status (ACTIVE/INACTIVE/BLOCKED) | Enforced on subsequent auth |

## Cross-cutting

| ID | Story | Acceptance |
|----|-------|------------|
| X1 | System releases expired holds | Seats return to AVAILABLE |
| X2 | Duplicate payment webhooks are safe | Single confirmed booking/payment |
| X3 | Notification failure does not undo booking | Notification FAILED, booking CONFIRMED |
