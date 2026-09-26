# Service Architecture

## AuthService

register, login, refresh, logout, me; password hash compare; refresh token rotation/hash storage.

## RideService

Admin create/update/cancel; customer search; getById; ensure seat init from vehicle; availableSeats maintenance.

## SeatService

`holdSeats(userId, rideId, seatNumbers)` — atomic multi-seat hold with single holdId.  
`releaseHold(holdId)` / `releaseExpired()`.  
`confirmSeatsBooked(holdId, bookingId)` — HELD→BOOKED.

Uses `findOneAndUpdate` with `arrayFilters` and/or transactions.

## BookingService

createFromHold; listForUser; getById; cancel; expirePending.

## PaymentService

Gateway adapter interface: `createOrder`, `verifySignature`, `parseWebhook`.  
confirmPayment idempotent: set payment SUCCESS, booking CONFIRMED, seats BOOKED, trigger notifications (non-blocking).

## NotificationService

sendBookingConfirmation, sendBookingCancellation, sendPaymentFailure, sendTripReminder (stub/log if unused).  
Email provider adapter; WhatsApp returns deep-link payload only.

## DriverOpsService

dashboard, listRides, getRide, passengers, updateStatus — always scoped by driverId.

## Admin services

DriverService, VehicleService, RouteService, UserAdminService, ReportService, AuditService.

## Logging events

`auth.login`, `ride.created`, `ride.updated`, `booking.created`, `booking.confirmed`, `booking.cancelled`, `seat.held`, `seat.released`, `payment.created`, `payment.success`, `payment.failed`, `notification.sent`, `notification.failed`
