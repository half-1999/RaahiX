# Notifications

## Channels

| Channel | MVP |
|---------|-----|
| EMAIL | Real provider/SMTP via adapter |
| WHATSAPP | Prefill deep link `https://wa.me/<WHATSAPP_NUMBER>?text=...` |
| SMS | Schema support only; not implemented |

## Types

- `BOOKING_CONFIRMATION`
- `BOOKING_CANCELLATION`
- `PAYMENT_FAILURE`
- `TRIP_REMINDER` (optional hook; may no-op)

## Isolation rule

Notification failure **must not** reverse Payment SUCCESS or Booking CONFIRMED. Persist Notification with `status=FAILED` and `error`.

## Email content (minimum)

Booking number, route, date/time, seats, amount, support note.

## WhatsApp

Client button uses server-provided or client-built prefilled text with booking summary. No Business API.
