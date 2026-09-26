# Collections

## User

| Field | Type | Notes |
|-------|------|-------|
| name | String | required |
| email | String | unique, lowercase |
| phone | String | unique |
| passwordHash | String | required |
| role | Enum | CUSTOMER, DRIVER, ADMIN |
| status | Enum | ACTIVE, INACTIVE, BLOCKED |
| emailVerified | Boolean | default false |
| phoneVerified | Boolean | default false |
| refreshTokenHash | String | optional; hashed refresh token |
| createdAt, updatedAt | Date | |

## Driver

| Field | Type | Notes |
|-------|------|-------|
| userId | ObjectId→User | required, unique |
| name | String | |
| phone | String | |
| licenseNumber | String | unique |
| verificationStatus | Enum | PENDING, VERIFIED, REJECTED |
| status | Enum | ACTIVE, INACTIVE, SUSPENDED |
| rating | Number | default 0 |
| totalTrips | Number | default 0 |
| createdAt, updatedAt | Date | |

## Vehicle

| Field | Type | Notes |
|-------|------|-------|
| driverId | ObjectId→Driver | required |
| registrationNumber | String | unique |
| make, model | String | |
| vehicleType | String | e.g. SEDAN |
| capacity | Number | > 0 |
| seatConfiguration | Array | [{seatNumber, row, position}] |
| features | [String] | optional |
| status | Enum | ACTIVE, INACTIVE, MAINTENANCE |
| createdAt, updatedAt | Date | |

## Route

| Field | Type | Notes |
|-------|------|-------|
| origin | {city, state} | required |
| destination | {city, state} | required |
| stops | [{name, city, state, sequence}] | |
| estimatedDuration | Number | minutes |
| status | Enum | ACTIVE, INACTIVE |
| createdAt, updatedAt | Date | |

## Ride

| Field | Type | Notes |
|-------|------|-------|
| routeId | ObjectId→Route | |
| driverId | ObjectId→Driver | |
| vehicleId | ObjectId→Vehicle | |
| date | Date | calendar date (UTC midnight or local date string stored consistently) |
| departureTime | String/Date | store ISO datetime preferred |
| arrivalTime | String/Date | |
| pickupPoint | String | |
| dropPoint | String | |
| pricePerSeat | Number | > 0 |
| totalSeats | Number | |
| availableSeats | Number | |
| seats | Array | inventory |
| status | Enum | SCHEDULED, BOARDING, STARTED, COMPLETED, CANCELLED |
| createdAt, updatedAt | Date | |

### Ride.seats[] item

| Field | Type |
|-------|------|
| seatNumber | String |
| status | AVAILABLE, HELD, BOOKED, BLOCKED |
| holdId | String? |
| holdExpiresAt | Date? |
| holdUserId | ObjectId? |
| bookingId | ObjectId? |

## Booking

| Field | Type | Notes |
|-------|------|-------|
| bookingNumber | String | unique human-readable |
| userId | ObjectId→User | |
| rideId | ObjectId→Ride | |
| passengers | Array | |
| selectedSeats | [String] | |
| passengerCount | Number | |
| amountPerSeat | Number | server-set |
| totalAmount | Number | server-set |
| currency | String | INR |
| paymentStatus | Enum | PENDING, PAID, FAILED, REFUNDED |
| bookingStatus | Enum | PENDING, CONFIRMED, CANCELLED, EXPIRED |
| holdId | String | links to seat hold |
| holdExpiresAt | Date | |
| cancellationReason | String? | |
| cancelledAt | Date? | |
| createdAt, updatedAt | Date | |

## Payment

| Field | Type | Notes |
|-------|------|-------|
| bookingId | ObjectId→Booking | |
| userId | ObjectId→User | |
| amount | Number | |
| currency | String | |
| gateway | String | e.g. razorpay |
| gatewayOrderId | String | indexed |
| gatewayPaymentId | String? | indexed |
| gatewaySignature | String? | |
| status | Enum | CREATED, PENDING, SUCCESS, FAILED, REFUNDED |
| paidAt | Date? | |
| refundAmount | Number? | |
| refundedAt | Date? | |
| rawResponse | Mixed | sanitized subset |
| createdAt, updatedAt | Date | |

## Notification

| Field | Type | Notes |
|-------|------|-------|
| userId | ObjectId→User | |
| bookingId | ObjectId→Booking? | |
| channel | Enum | EMAIL, WHATSAPP, SMS |
| type | String | e.g. BOOKING_CONFIRMATION |
| status | Enum | PENDING, SENT, FAILED |
| recipient | String | |
| message | String | |
| sentAt | Date? | |
| error | String? | |
| createdAt | Date | |

## AuditLog

| Field | Type | Notes |
|-------|------|-------|
| actorId | ObjectId | |
| actorRole | String | |
| action | String | |
| entityType | String | |
| entityId | String/ObjectId | |
| oldValue | Mixed | |
| newValue | Mixed | |
| metadata | Mixed | |
| createdAt | Date | |
