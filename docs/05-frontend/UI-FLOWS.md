# UI Flows

## Customer search → confirm

1. Homepage hero: brand + search form (origin, destination, date, passengers)
2. Results: ride cards with time, duration, price, seats left
3. Detail: trip info + interactive seat map + CTA Hold & Continue
4. Hold active: timer visible; passenger form
5. Checkout: price breakdown (read-only from server) + Pay
6. Gateway redirect/modal
7. Success: booking number, seats, WhatsApp button, email note

## Empty / error examples

- “No rides available for this route/date.”
- “You don’t have any upcoming bookings.”
- “Seat hold expired. Please select seats again.”
- “Payment could not be verified. Contact support if amount was deducted.”

## Driver

1. Today’s primary ride card
2. Tap → passengers + seats
3. Status controls as primary actions

## Admin

1. Dashboard KPIs
2. Entity tables with search/filter
3. Create/Edit drawers or pages
4. Destructive actions require confirm modal (“Cancel ride”)
