# RaahiX — Testing report

Reseeded into MongoDB Atlas on 3 Oct 2026, about 4:27 PM IST. The previous users, rides, and bookings were deleted first.

- App: http://localhost:5173
- API: http://localhost:5055/api
- Health: http://localhost:5055/api/health

Times below are **IST**. Search only returns rides that have **not departed yet**.

Payment is **direct to the driver**. Checkout shows the driver’s UPI ID and asks for a screenshot (PNG, JPEG, or WebP, up to 2 MB). Uploading the screenshot does **not** confirm the booking. The driver approves or rejects it. There is no Razorpay step.

A hold lasts **10 minutes**. If that window passes before the driver approves, the booking is not confirmed and the seats are released.

---

## Login credentials

| Role | Name | Email | Password | Phone |
| --- | --- | --- | --- | --- |
| Admin | Ops Admin | admin@localcab.dev | Admin@12345 | 9000000001 |
| Driver | Raj Kumar | raj.driver@localcab.dev | Driver@12345 | 9000001001 |
| Driver | Amit Singh | amit.driver@localcab.dev | Driver@12345 | 9000001002 |
| Customer | Priya Sharma | priya.customer@localcab.dev | Customer@12345 | 9111100001 |
| Customer | Rohan Mehta | rohan.customer@localcab.dev | Customer@12345 | 9111100002 |
| Customer | Sneha Patel | sneha.customer@localcab.dev | Customer@12345 | 9111100003 |
| Customer | Vikram Joshi | vikram.customer@localcab.dev | Customer@12345 | 9111100004 |

After login:

- Admin opens `/admin`
- Driver opens `/driver` (also Vehicles, Routes, Payments)
- Customer opens `/search` (bookings at `/my-bookings`, alerts at `/notifications`)

---

## Drivers and payment details

Both drivers are **VERIFIED** and **ACTIVE**. Rating 4.6.

| Driver | UPI | Instructions | Licence | Vehicle |
| --- | --- | --- | --- | --- |
| Raj Kumar | rajdriver@upi | Pay the exact fare, then upload the screenshot. | DL-07-2024001 | Maruti Dzire · DL01AB1001 · 5-seater, and the corridor Ertiga |
| Amit Singh | amitdriver@upi | Pay the exact fare, then upload the screenshot. | UP-25-2024002 | Maruti Ertiga · UP25CD2002 · 6-seater |

The corridor ride on 5 Oct uses Raj’s Ertiga as well as his Dzire on the other routes.

### Cabin seats

**5-seater (Dzire)** — A1, B1, B2, B3, C1

**6-seater (Ertiga)** — A1, B1, B2, B3, C1, C2

Features on both cabs: AC, Charging.

---

## Routes

| # | From | To | Stops | Duration |
| --- | --- | --- | --- | --- |
| 1 | Gurugram, Haryana | Bareilly, Uttar Pradesh | Moradabad | 6h |
| 2 | Delhi | Bareilly, Uttar Pradesh | — | 6h 30m |
| 3 | Gurugram, Haryana | Haldwani, Uttarakhand | Rampur | 7h |
| 4 | Richha, Uttar Pradesh | Gurugram, Haryana | Delhi, Noida | 7h |

Route 4 is the segment ride. A customer can book any forward pair: Richha → Delhi, Richha → Noida, Delhi → Noida, Delhi → Gurugram, Noida → Gurugram, or the full Richha → Gurugram. Backward pairs are rejected.

---

## Rides (21)

Open seats for rides 1–4 and 6–21 are named seats (**available / total**). Ride 5 is segment-aware: the whole cab still lists 6 named seats, but Richha → Delhi already has 2 seats committed, so that stretch has **4** left. Delhi → Noida and Noida → Gurugram still have **6**.

| # | Date | Depart (IST) | Arrive (IST) | Route | Pickup → Drop | Fare / seat | Open | Booked | Driver | Cab | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 3 Oct 2026 | 4:30 PM | 10:30 PM | Gurugram → Bareilly | IFFCO Chowk Metro → Civil Lines Bareilly | ₹700 | 2/5 | A1, B1, B3 | Raj Kumar | Dzire 5 | SCHEDULED |
| 2 | 3 Oct 2026 | 5:30 PM | 11:30 PM | Gurugram → Bareilly | Cyber Hub → Bareilly Bus Stand | ₹775 | 5/6 | A1 | Amit Singh | Ertiga 6 | SCHEDULED |
| 3 | 4 Oct 2026 | 1:30 PM | 8:00 PM | Delhi → Bareilly | Kashmere Gate → Civil Lines Bareilly | ₹850 | 4/5 | B2 | Raj Kumar | Dzire 5 | SCHEDULED |
| 4 | 4 Oct 2026 | 2:30 PM | 9:00 PM | Delhi → Bareilly | Anand Vihar ISBT → Bareilly Junction | ₹780 | 6/6 | — | Amit Singh | Ertiga 6 | SCHEDULED |
| 5 | 5 Oct 2026 | 1:30 PM | 8:30 PM | Richha → Delhi → Noida → Gurugram | Richha stand → Gurugram | ₹450 | 4 on Richha→Delhi, 6 on the later legs | segment A1, B1 (Richha→Delhi) | Raj Kumar | Ertiga 6 | PUBLISHED |
| 6 | 5 Oct 2026 | 3:30 PM | 10:30 PM | Gurugram → Haldwani | MG Road Gurugram → Haldwani Tallital | ₹925 | 5/5 | — | Raj Kumar | Dzire 5 | SCHEDULED |
| 7 | 5 Oct 2026 | 7:30 PM | 2:30 AM | Gurugram → Haldwani | Sector 29 → Kathgodam Side | ₹1000 | 6/6 | — | Amit Singh | Ertiga 6 | SCHEDULED |
| 8 | 6 Oct 2026 | 9:30 PM | 3:30 AM | Gurugram → Bareilly | IFFCO Chowk Metro → Civil Lines Bareilly | ₹700 | 5/5 | — | Raj Kumar | Dzire 5 | SCHEDULED |
| 9 | 6 Oct 2026 | 11:30 PM | 5:30 AM | Gurugram → Bareilly | Cyber Hub → Bareilly Bus Stand | ₹775 | 6/6 | — | Amit Singh | Ertiga 6 | SCHEDULED |
| 10 | 7 Oct 2026 | 11:30 AM | 6:00 PM | Delhi → Bareilly | Kashmere Gate → Civil Lines Bareilly | ₹850 | 5/5 | — | Raj Kumar | Dzire 5 | SCHEDULED |
| 11 | 7 Oct 2026 | 12:30 PM | 7:00 PM | Delhi → Bareilly | Anand Vihar ISBT → Bareilly Junction | ₹780 | 6/6 | — | Amit Singh | Ertiga 6 | SCHEDULED |
| 12 | 8 Oct 2026 | 1:30 PM | 8:30 PM | Gurugram → Haldwani | MG Road Gurugram → Haldwani Tallital | ₹925 | 5/5 | — | Raj Kumar | Dzire 5 | SCHEDULED |
| 13 | 8 Oct 2026 | 2:30 PM | 9:30 PM | Gurugram → Haldwani | Sector 29 → Kathgodam Side | ₹1000 | 6/6 | — | Amit Singh | Ertiga 6 | SCHEDULED |
| 14 | 9 Oct 2026 | 3:30 PM | 9:30 PM | Gurugram → Bareilly | IFFCO Chowk Metro → Civil Lines Bareilly | ₹700 | 5/5 | — | Raj Kumar | Dzire 5 | SCHEDULED |
| 15 | 9 Oct 2026 | 7:30 PM | 1:30 AM | Gurugram → Bareilly | Cyber Hub → Bareilly Bus Stand | ₹775 | 6/6 | — | Amit Singh | Ertiga 6 | SCHEDULED |
| 16 | 10 Oct 2026 | 9:30 PM | 4:00 AM | Delhi → Bareilly | Kashmere Gate → Civil Lines Bareilly | ₹850 | 5/5 | — | Raj Kumar | Dzire 5 | SCHEDULED |
| 17 | 10 Oct 2026 | 11:30 PM | 6:00 AM | Delhi → Bareilly | Anand Vihar ISBT → Bareilly Junction | ₹780 | 6/6 | — | Amit Singh | Ertiga 6 | SCHEDULED |
| 18 | 11 Oct 2026 | 11:30 AM | 6:30 PM | Gurugram → Haldwani | MG Road Gurugram → Haldwani Tallital | ₹925 | 5/5 | — | Raj Kumar | Dzire 5 | SCHEDULED |
| 19 | 11 Oct 2026 | 12:30 PM | 7:30 PM | Gurugram → Haldwani | Sector 29 → Kathgodam Side | ₹1000 | 6/6 | — | Amit Singh | Ertiga 6 | SCHEDULED |
| 20 | 12 Oct 2026 | 1:30 PM | 7:30 PM | Gurugram → Bareilly | IFFCO Chowk Metro → Civil Lines Bareilly | ₹700 | 5/5 | — | Raj Kumar | Dzire 5 | SCHEDULED |
| 21 | 12 Oct 2026 | 2:30 PM | 8:30 PM | Gurugram → Bareilly | Cyber Hub → Bareilly Bus Stand | ₹775 | 6/6 | — | Amit Singh | Ertiga 6 | SCHEDULED |

Ride 1 leaves at 4:30 PM today. If that time has passed, it will not appear in search. Use ride 2 (5:30 PM) or any later row.

Raj Kumar drives the Dzire rides and the Richha corridor. Amit Singh drives the other Ertiga rides.

---

## Bookings already in the database

All five are **CONFIRMED**, proof **APPROVED**, payment **PAID**. Refund status is **NOT_APPLICABLE** because nobody has cancelled.

| Booking | Customer | Login | Ride | Seats | Segment | Amount |
| --- | --- | --- | --- | --- | --- | --- |
| BKSEED0001 | Priya Sharma | priya.customer@localcab.dev | #1 Gurugram → Bareilly, 3 Oct, 4:30 PM | A1 | full route | ₹700 |
| BKSEED0002 | Rohan Mehta | rohan.customer@localcab.dev | #1 Gurugram → Bareilly, 3 Oct, 4:30 PM | B1, B3 | full route | ₹1400 |
| BKSEED0003 | Sneha Patel | sneha.customer@localcab.dev | #2 Gurugram → Bareilly, 3 Oct, 5:30 PM | A1 | full route | ₹775 |
| BKSEED0004 | Vikram Joshi | vikram.customer@localcab.dev | #3 Delhi → Bareilly, 4 Oct, 1:30 PM | B2 | full route | ₹850 |
| BKSEED0099 | Priya Sharma | priya.customer@localcab.dev | #5 Richha → Gurugram, 5 Oct, 1:30 PM | A1, B1 | Richha → Delhi | ₹900 |

Priya’s My Bookings should show BKSEED0001 under Upcoming or Active depending on whether ride 1 has started, and BKSEED0099 under Upcoming.

---

## Suggested test paths

### Segment booking and driver approval

Use this path first. It is the current product flow.

1. Log in as `rohan.customer@localcab.dev` / `Customer@12345`.
2. Open http://localhost:5173/search?originCity=Delhi&destinationCity=Noida&date=2026-10-05&passengers=1
3. The Richha corridor (ride #5, ₹450, Raj Kumar) should be listed. Delhi → Noida still has 6 seats. Richha → Delhi would show 4.
4. Choose the ride, pick one or two seats, enter passengers, and continue to checkout.
5. Checkout should show UPI **rajdriver@upi** and the instruction to pay the exact fare. Upload any small PNG or JPEG. Do not expect a payment gateway.
6. The booking stays **PENDING** / proof **SUBMITTED**. It is not confirmed yet. Seats stay held for 10 minutes.
7. Log out. Log in as `raj.driver@localcab.dev` / `Driver@12345`.
8. Open **Payments** (`/driver/payments`). Approve Rohan’s screenshot.
9. Log back in as Rohan. My Bookings → Upcoming should show the booking as **CONFIRMED**. Alerts (`/notifications`) should include the payment and confirmation notes.

To see a rejection: repeat with `sneha.customer@localcab.dev`, then as Raj choose **Reject** and enter a reason. The booking becomes **CANCELLED** and those seats return.

To see overlap: after Rohan’s Delhi → Noida booking is confirmed, search Richha → Gurugram on 5 Oct. That stretch shares the Delhi → Noida leg, so availability drops by however many seats Rohan took.

### Customer bookings already seeded

1. Log in as Priya. **My bookings** has two confirmed tickets: Gurugram → Bareilly today, and Richha → Delhi on 5 Oct.
2. Open the Richha ticket. Proof should read APPROVED. Refund should read NOT_APPLICABLE.
3. Search Gurugram → Bareilly for today only if it is still before 4:30 PM (ride #1, free seats B2 and C1) or before 5:30 PM (ride #2, A1 is taken).

### Driver operations

1. Log in as Raj.
2. **Today** shows the Gurugram → Bareilly trip if it has not departed.
3. Open ride #5 under **Rides**. Status is PUBLISHED. The next action starts the trip (**ACTIVE**), then **COMPLETED**.
4. **Vehicles** lists the Dzire. **Routes** can add another ordered stop list (`name | city | state`, one stop per line).
5. **Payments** lists bookings on Raj’s rides, including Priya’s approved Richha → Delhi ticket and any new screenshot waiting for review.
6. Amit’s login shows his Ertiga rides and Sneha’s booking on ride #2. Amit cannot approve a payment on Raj’s ride.

### Admin

1. Log in as `admin@localcab.dev` / `Admin@12345`.
2. Expect 7 users, 2 drivers, 2 vehicles, 4 routes, 21 rides, 5 bookings.
3. Bookings show proof **APPROVED** and refund **NOT_APPLICABLE**.
4. Changing a user, driver, or ride asks for a reason. Cancelling a ride also asks for a reason and keeps the booking history.

---

## Reseed

From the `server` folder. This **deletes** RaahiX users, drivers, vehicles, locations, routes, rides, bookings, payments, notifications, and audit logs, then inserts this dataset again:

```bash
npm run seed
```
