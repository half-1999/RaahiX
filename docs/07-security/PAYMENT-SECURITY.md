# Payment Security

## Rules

1. Server calculates amount from ride.pricePerSeat × seats.
2. Create gateway order only for owned PENDING booking within hold window.
3. Verify payment signature with gateway secret server-side.
4. Webhook authenticity verified (signature/secret).
5. Confirmation idempotent on `gatewayPaymentId` / bookingId.
6. Never confirm booking from client “success” alone without verify.
7. Do not store full card data; only gateway ids + sanitized rawResponse.
8. Log `payment.success` / `payment.failed` without secrets.

## Gateway abstraction

```text
PaymentGateway.createOrder({ amount, currency, receipt })
PaymentGateway.verifySignature(payload)
PaymentGateway.parseWebhook(headers, rawBody)
```

MVP default: Razorpay-compatible adapter selectable via `PAYMENT_GATEWAY`.

## Failure handling

- Failed verify → payment FAILED; seats remain HELD until expiry/release
- Success after prior success → return existing confirmed state
