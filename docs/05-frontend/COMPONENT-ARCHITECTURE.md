# Component Architecture

## UI primitives (`components/ui`)

Button, Input, Select, Badge, Table, Modal, Skeleton, EmptyState, Alert, Spinner

Keep primitives unopinionated; brand tokens via CSS variables / Tailwind theme.

## Layout

- `PublicLayout` — marketing/booking chrome
- `CustomerLayout` — account nav
- `DriverLayout` — mobile-first bottom/top nav
- `AdminLayout` — sidebar + top bar

## Domain

### rides
`RideSearchForm`, `RideCard`, `RideSummary`

### seats
`SeatMap`, `SeatLegend`, `HoldTimer` — render from API seatConfiguration + statuses only

### booking
`PassengerForm`, `CheckoutSummary`, `BookingCard`, `WhatsAppAction`

### common
`StatusBadge`, `ErrorBoundary`, `PageHeader`

## Page composition

Pages own data fetching (hooks/query); components stay presentational where practical.

## Anti-patterns

- Hardcoded seat grids
- Cards wrapping every admin metric unnecessarily
- Giant god-components (>300 lines) — split by section
