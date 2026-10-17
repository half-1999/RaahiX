# Indian demo rides & smart search

Demonstration inventory only. These records are **not** live marketplace offers, verified drivers, or confirmed real-world availability.

## Seed command

```bash
cd server
ALLOW_SEED_RESET=true npm run seed
```

Blocked when `NODE_ENV=production` unless `ALLOW_SEED_RESET=true`. Demo booking outside production is controlled by `ALLOW_DEMO_BOOKING` (defaults to allowed when not production).

Credentials: see `docs/DEMO_SEED_DATA_AND_CREDENTIALS.md`.

## Ten demo drivers

| Driver | Vehicle (demo) | Primary corridors |
|--------|----------------|-------------------|
| Aarav Sharma | Maruti Swift (hatchback/5-seat) | Delhi ↔ Chandigarh |
| Neha Verma | Honda City (sedan) | Delhi ↔ Jaipur |
| Arjun Singh | Hyundai Verna (sedan) | Chandigarh ↔ Delhi |
| Priya Patel | Tata Tiago (hatchback) | Mumbai ↔ Pune |
| Rahul Kumar | Maruti Dzire (sedan) | Lucknow → Kanpur |
| Ananya Reddy | Honda Amaze (sedan) | Hyderabad → Vijayawada |
| Vikram Mehta | Mahindra XUV700 (SUV/6-seat) | Delhi ↔ Dehradun |
| Kavya Nair | Hyundai i20 (hatchback) | Bengaluru ↔ Mysuru |
| Rohit Yadav | Toyota Glanza (sedan) | Delhi ↔ Agra |
| Ishita Das | Maruti Ciaz (sedan) | Chennai → Bengaluru |

All use `@localcab.dev` emails, `Driver@12345`, reserved `90000010xx` phones, and `isDemo` / `isSeed` markers. Ratings are not invented (seeded at 0).

## Sample routes

Delhi↔Chandigarh, Delhi↔Jaipur, Delhi↔Agra, Delhi↔Dehradun, Gurugram→Jaipur, Chandigarh→Shimla, Mumbai↔Pune, Bengaluru↔Mysuru, Hyderabad→Vijayawada, Chennai→Bengaluru, Lucknow→Kanpur, plus a Gurugram–Bareilly corridor segment demo.

Departures use relative offsets from the seed calendar (starts **18 October** while that date is upcoming). Hours span early morning through late evening. Overnight journeys store next-day `arrivalTime`.

## Distinguishing demo vs genuine

| Field | Meaning |
|-------|---------|
| `isDemo: true` | Demonstration record |
| `isSeed: true` | Created by the seed wipe/reseed |
| API `bookable` | `false` for fully booked; demo booking gated by `config.demo.allowBooking` |

UI shows a **Demo ride** badge. Fully booked rides appear in a separate section and cannot start seat selection.

## Search tiers

1. **Available** — genuine bookable rides ranked by the scoring service. If none exist, labeled demo opens are shown so local discovery still works.
2. **Fully booked** — matching route/date but fewer open seats than requested passengers; booking disabled.
3. **Demo** — when inventory kind is demo, the same labeled sample rides are returned under `demo` / `available` with `meta.inventoryKind = 'demo'`.

## Ranking

Weights (configurable via `RANK_W_*` env or `config.ranking`):

| Signal | Default |
|--------|---------|
| Departure-time match | 40% |
| Route match | 30% |
| Price suitability | 15% |
| Seat availability | 10% |
| Quality (only real ratings) | 5% |

Rules:

- Exact route/date eligibility is applied **before** scoring.
- Demo rides never outrank genuine rides in a mixed list.
- Fully booked rides are never placed in the available list.
- Sort modes: `recommended`, `price`, `departure`, `availability`.

## Seat occupancy

Authoritative counts come from `seatService` / segment remaining seats: confirmed bookings, active holds, and verification holds per policy. Expired holds do not permanently occupy seats. Fully booked demo seats may be marked `BOOKED` without creating real passenger accounts.

## Revenue isolation

Demo/seed payments are for workflow testing. Do not treat them as production revenue. Prefer filtering `isSeed` / `isDemo` in financial exports.

## Empty search troubleshooting

1. Confirm date is a future calendar day with seeded departures (reseed if the window expired).
2. City names must match location cities (case-insensitive), e.g. `Delhi`, `Bengaluru`.
3. Try reverse route or tomorrow.
4. Clear client filters (time of day / vehicle type).
5. Re-run `ALLOW_SEED_RESET=true npm run seed`.

## Schedule window

Seed day-0 is 18 Oct of the current year while that date is upcoming; afterward day-0 follows “today”. Active/completed demos stay wall-clock relative. Re-run seed to refresh future schedules.
