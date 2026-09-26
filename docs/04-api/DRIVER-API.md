# Driver API

All endpoints require **Bearer** + role **DRIVER**.

## GET /api/driver/dashboard

- **Success 200:** `{ todayRides, upcomingCount, completedToday }` summary

## GET /api/driver/rides

- **Query:** `date?`, `status?`
- **Success 200:** rides assigned to authenticated driver only

## GET /api/driver/rides/:rideId

- **Success 200:** ride detail if assigned
- **Errors:** 404 RIDE_NOT_FOUND; 403 AUTH_FORBIDDEN if not assigned

## GET /api/driver/rides/:rideId/passengers

- **Success 200:** `{ passengers: [{ name, phone, seatNumber, bookingNumber }], seats }`
- Confirmed bookings only for passenger list

## PATCH /api/driver/rides/:rideId/status

- **Body:** `{ status }` one of BOARDING, STARTED, COMPLETED (from allowed transition)
- **Success 200:** updated ride
- **Errors:** 400 invalid transition; 403 not assigned

## Forbidden for drivers

- Admin endpoints
- Payment amount changes
- Other drivers’ rides
- User directory
