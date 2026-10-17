# RaahiX Passenger User Manual

Step-by-step guide for registered passengers (customers).

## 1. Register or sign in

1. Open RaahiX and choose **Sign up** (passenger) or **Log in**.
2. After login you land on your **passenger dashboard** (`/app`), not the public home page.
3. Use the profile menu (avatar icon) for Dashboard, Profile, My trips, theme, and Log out.

## 2. Passenger dashboard tabs

Typical tabs under `/app`:

- **Overview** — bookings at a glance, spending summary
- **Rides / Trips** — browse history and upcoming bookings
- **Payments** — payment statuses for your bookings
- **Profile** — name, phone, refund UPI, password

## 3. Search and book a ride

1. From the public site or search page, choose **origin**, **destination**, and **date**.
2. Open a ride that is **Scheduled** (future departure).
3. Select seats (and segment stops when the corridor has multiple cities).
4. Hold seats, enter passenger details, then create the booking.
5. Follow the **payment proof** flow (UPI screenshot to the driver) when prompted.
6. After the driver approves the proof, your booking is **Confirmed**.

Features that are **not** available unless you see them in the app: live GPS tracking, instant card checkout gateway (unless configured), or editing another passenger’s booking.

## 4. View booking and ride status

1. Open **My trips** / booking detail from the dashboard.
2. Ride status follows: **Scheduled → Active → Completed** (driven by the driver’s schedule and server automation).
3. Booking status (Pending / Confirmed / Cancelled / Expired) is separate from ride status.
4. Fare, seats, and payment/proof status appear on the booking detail page.

## 5. Payments

1. After selecting seats you get a temporary hold (about 10 minutes). Finish payment before it expires.
2. Pay using the driver’s UPI instructions shown at checkout.
3. Upload a screenshot as payment proof. This does **not** instantly confirm the seat — the driver must verify.
4. After upload, the hold may extend for a bounded verification window while the driver reviews.
5. Note your **RAAHIX** payment ID in Payments history.
6. Wait for driver approval. Rejection may include a reason.
7. Refunds appear under Payments → Refunds with the original RAAHIX reference.

Demo logins: see `docs/DEMO_SEED_DATA_AND_CREDENTIALS.md`.

## 6. Cancel a booking

If the cancel action is shown on your booking:

1. You can cancel only before the ride becomes **Active** or **Completed**.
2. Refund obligation depends on timing rules already configured on the server.

## 7. Manual passengers added by drivers

Drivers may add **walk-in guests** who do not have RaahiX accounts. Those guests:

- Do not appear in your passenger dashboard as “your” bookings
- Are managed only by the driver who created them

Registered passengers only see bookings they created while logged in.

## 8. Account settings

1. Open **Profile**.
2. Update name, phone, age, address, and refund UPI.
3. Change password by entering current + new password.
4. Email and username are not editable in the self-serve form.

## 9. Common issues

| Problem | Tip |
|---------|-----|
| No rides in search | Try another date; only **Scheduled** future rides appear |
| Hold expired | Seats are held briefly — complete booking sooner |
| Cannot open driver pages | Those routes require a driver account |
| Theme wrong | Use profile menu → Dark / Light mode |

## 10. Support

Use in-app notifications where available. Contact details for WhatsApp/support appear when the operator has configured them in the environment.
