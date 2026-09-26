# Implementation Plan

Execute phases 0–10 sequentially. After each phase: run app/tests, update TASK-BREAKDOWN, fix blockers, then proceed.

| Phase | Focus | Exit criteria |
|-------|-------|---------------|
| 0 | Documentation | Full docs tree; internal consistency review |
| 1 | Foundation | client + server boot; Mongo connected |
| 2 | Auth | register/login/refresh/logout/me + role guards |
| 3 | Admin ops | create driver/vehicle/route/ride end-to-end |
| 4 | Search | homepage + search + ride + seats UI/API |
| 5 | Booking | hold concurrency + booking CRUD + cancel |
| 6 | Payment | order/verify/webhook idempotent confirm |
| 7 | Notifications | email + WhatsApp action + logs |
| 8 | Driver | dashboard/rides/passengers/status |
| 9 | Admin reports | metrics, reports, audit UI |
| 10 | Hardening | tests, seed, README, security pass |

## Decision defaults (ambiguity)

- Payment gateway: Razorpay adapter
- Email: Nodemailer SMTP or provider API behind adapter; console transport in dev if no key
- Refresh tokens in JSON body for SPA MVP
- Ride `departureTime`/`arrivalTime` stored as Date (ISO)
- DELETE admin ride → cancel if bookings else allow remove
