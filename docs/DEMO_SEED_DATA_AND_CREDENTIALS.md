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
| `ALLOW_DEMO_BOOKING` | non-prod true | Allow booking labeled demo rides |

Scheduled demo journeys use a seed calendar that starts on **18 October** of the current year when that date is still upcoming. See `docs/INDIAN_DEMO_RIDES_AND_SEARCH.md` for ranking and search tiers.

## Demo accounts

| Role | Email | Username | Password | Purpose |
|------|-------|----------|----------|---------|
| Admin | `admin@localcab.dev` | `opsadmin` | `Admin@12345` | Ops / verification |
| Driver | `aarav.driver@localcab.dev` | `aaravsharma` | `Driver@12345` | Delhi–Chandigarh |
| Driver | `neha.driver@localcab.dev` | `nehaverma` | `Driver@12345` | Delhi–Jaipur |
| Driver | `arjun.driver@localcab.dev` | `arjunsingh` | `Driver@12345` | Chandigarh–Delhi |
| Driver | `priya.driver@localcab.dev` | `priyapatel` | `Driver@12345` | Mumbai–Pune |
| Driver | `rahul.driver@localcab.dev` | `rahulkumar` | `Driver@12345` | Lucknow–Kanpur |
| Driver | `ananya.driver@localcab.dev` | `ananyareddy` | `Driver@12345` | Hyderabad–Vijayawada |
| Driver | `vikram.driver@localcab.dev` | `vikrammehta` | `Driver@12345` | Delhi–Dehradun SUV |
| Driver | `kavya.driver@localcab.dev` | `kavyanair` | `Driver@12345` | Bengaluru–Mysuru |
| Driver | `rohit.driver@localcab.dev` | `rohityadav` | `Driver@12345` | Delhi–Agra |
| Driver | `ishita.driver@localcab.dev` | `ishitadas` | `Driver@12345` | Chennai–Bengaluru |
| Passenger | `priya.customer@localcab.dev` | `priyasharma` | `Customer@12345` | Bookings + pending proof |
| Passenger | `rohan.customer@localcab.dev` | `rohanmehta` | `Customer@12345` | Multi-seat booking |
| Passenger | `sneha.customer@localcab.dev` | `snehapatel` | `Customer@12345` | Sample booking |
| Passenger | `vikram.customer@localcab.dev` | `vikramjoshi` | `Customer@12345` | Sample booking |

All ten drivers are fictional demo profiles (`isDemo: true`). Vehicles use clearly fictional `…DM…` registration plates.

## Payments & refunds

- Public payment IDs use **`RAAHIX######`**.
- Manual UPI proof ≠ bank confirmation; driver approval is verification bookkeeping.
- Seed refunds are reconciliation examples, not live gateway refunds.

## How to sign in

1. Start API + client (`npm run dev` from repo root).
2. Open `/login`.
3. Use an email/username and password from the table above.

## Reset safely

Re-run `ALLOW_SEED_RESET=true npm run seed` in `server/`. Do **not** run against a production database.
