# Task Breakdown

Track progress with checkboxes. Mark complete only when verified working.

## Phase 0 — Documentation

- [x] Create docs directory structure
- [x] Product docs (PRD, MVP-SCOPE, USER-STORIES, FUTURE-SCOPE)
- [x] System docs (architecture, modules, flows, state machines)
- [x] Database docs (schema, collections, indexes, relationships)
- [x] API docs (spec, auth, customer, driver, admin)
- [x] Frontend docs
- [x] Backend docs
- [x] Security docs
- [x] Implementation docs
- [x] Operations docs
- [x] Internal consistency review (holdId/holdUserId; ride soft-cancel; payment SUCCESS→PAID; API port 5055 default)

## Phase 1 — Foundation

- [x] Initialize repository root (gitignore, README, package.json)
- [x] Setup server (Express, Mongoose, config, error handler, logger)
- [x] Setup client (Vite React, Tailwind, Router)
- [x] Environment `.env.example` files
- [x] MongoDB connection (with memory-mongo fallback)
- [x] Verify apps start (`server` :5055, `client` :5173)

## Phase 2 — Authentication

- [x] User model + indexes
- [x] Auth service/routes (register, login, refresh, logout, me)
- [x] Auth middleware + role authorize
- [x] Client login/register/profile session
- [x] Protected/role routes
- [x] Auth tests

## Phase 3 — Admin operations

- [x] Driver / Vehicle / Route / Ride models
- [x] Admin APIs CRUD
- [x] Seat init from vehicle configuration
- [x] Admin UI pages
- [x] Audit log on key mutations
- [x] Verify admin can create complete ride (seed + APIs)

## Phase 4 — Customer search

- [x] Search endpoint
- [x] Homepage + search UI
- [x] Ride details + seat map (data-driven)
- [x] Empty/loading/error states

## Phase 5 — Booking engine

- [x] Atomic seat hold
- [x] Booking create from hold
- [x] My bookings / details / cancel
- [x] Hold expiry job
- [x] Concurrency tests

## Phase 6 — Payment

- [x] Payment model + gateway adapter (Razorpay + mock)
- [x] create-order / verify / webhook
- [x] Idempotent confirmation
- [x] Checkout UI
- [x] Payment tests

## Phase 7 — Notifications

- [x] Notification model + service
- [x] Email confirmation/cancellation (console provider in dev)
- [x] WhatsApp prefilled action
- [x] Failure isolation from booking

## Phase 8 — Driver dashboard

- [x] Driver APIs
- [x] Driver UI (today, passengers, status)
- [x] Authorization tests (other driver’s ride)

## Phase 9 — Admin reporting

- [x] Dashboard metrics
- [x] Revenue / bookings / rides reports
- [x] Payments list
- [x] Audit log UI

## Phase 10 — Hardening

- [x] Seed script (+ auto-seed with memory mongo)
- [x] Critical test suite (8 passing)
- [x] Security checklist items implemented in code
- [x] Root README complete
- [ ] Manual critical acceptance tests in browser (pending local walkthrough)
- [x] Implementation summary (see chat report)
