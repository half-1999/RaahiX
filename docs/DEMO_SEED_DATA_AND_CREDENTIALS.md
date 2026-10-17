# Demo seed data & credentials

**Local / test environments only.** These accounts are hashed with bcrypt by the seed script. Never use them in production.

## Commands

```bash
# From repo root — wipes demo collections and reseeds (blocked when NODE_ENV=production unless ALLOW_SEED_RESET=true)
cd server
ALLOW_SEED_RESET=true npm run seed
```

Optional env:

| Variable | Default | Purpose |
|----------|---------|---------|
| `SEED_ADMIN_EMAIL` | `admin@localcab.dev` | Admin login email |
| `SEED_ADMIN_PASSWORD` | `Admin@12345` | Admin password |
| `ALLOW_SEED_RESET` | implied non-prod | Explicit allow when needed |
| `HOLD_DURATION_MINUTES` | `10` | Seat hold before payment |
| `VERIFICATION_HOLD_MINUTES` | `30` | Bound hold after proof upload |

Scheduled demo journeys use a seed calendar that starts on **18 October** of the current year when that date is still upcoming (so a reseed on 17 Oct produces 18 Oct+ departures). After 18 Oct, day-0 follows “today” so reseeds stay fresh. Active/completed demos stay relative to wall-clock time.

## Demo accounts

| Role | Email | Username | Password | Purpose |
|------|-------|----------|----------|---------|
| Admin | `admin@localcab.dev` | `opsadmin` | `Admin@12345` | Ops / verification |
| Driver | `raj.driver@localcab.dev` | `rajkumar` | `Driver@12345` | Primary car owner |
| Driver | `amit.driver@localcab.dev` | `amitsingh` | `Driver@12345` | Second car owner |
| Passenger | `priya.customer@localcab.dev` | `priyasharma` | `Customer@12345` | Bookings + pending proof |
| Passenger | `rohan.customer@localcab.dev` | `rohanmehta` | `Customer@12345` | Multi-seat booking |
| Passenger | `sneha.customer@localcab.dev` | `snehapatel` | `Customer@12345` | Sample booking |
| Passenger | `vikram.customer@localcab.dev` | `vikramjoshi` | `Customer@12345` | Sample booking |

## Vehicles (fictional demo plates)

- Raj: Maruti Dzire · `DL01AB1001` · 5-seater
- Amit: Maruti Ertiga · `UP25CD2002` · 6-seater

UPI demo IDs use `…@upi` style handles — not real bank credentials.

## Sample corridors

Delhi↔Chandigarh, Delhi↔Jaipur, Delhi↔Agra, Delhi→Dehradun, Gurugram→Jaipur, Chandigarh→Shimla, Mumbai→Pune, Bengaluru→Mysuru, Hyderabad→Vijayawada, Chennai→Bengaluru, Lucknow→Kanpur, Gurugram→Bareilly (+ Richha corridor segment ride).

Rides include **scheduled**, **active**, and **completed** statuses with relative timestamps so “today / upcoming” stay useful after each reseed.

## Payments & refunds

- Public payment IDs use the **`RAAHIX######`** format (e.g. `RAAHIX000001`).
- Seeded confirmed bookings create successful `manual_upi` payment rows with matching references.
- One booking is left **PENDING + SUBMITTED** proof for driver approval practice.
- One confirmed booking is converted into a **completed partial refund** demo (`refundReference` like `RFND-RAAHIX…`).

### Limitations (manual UPI workflow)

Uploading a screenshot does **not** confirm a bank transfer. Driver approval is a manual verification step. Refunds marked completed in seed data represent reconciliation bookkeeping — not a live payment-gateway refund API.

## How to sign in

1. Start API + client (`npm run dev` from repo root).
2. Open `/login`.
3. Use an email/username and password from the table above.
4. Drivers land on `/driver`; passengers on `/app`.

## Reset safely

Re-run `ALLOW_SEED_RESET=true npm run seed` in `server/`. This deletes users/rides/bookings/payments/locations used by the demo wipe — do **not** run against a production database.
