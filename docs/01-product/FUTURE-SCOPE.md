# Future Scope

Documented for later; **do not implement in MVP**.

## Product

- Real-time GPS / live driver tracking
- Native Android / iOS apps
- In-app chat / voice calling
- Driver bidding / matching
- Surge pricing
- Coupons / promo engine
- Referral / loyalty
- Wallet
- Reviews & ratings
- Support tickets
- Multi-stop seat booking nuances
- Map integration / place autocomplete beyond simple city lists
- AI recommendations

## Ops & finance

- Driver earnings settlement
- Advanced analytics / BI
- Automated refunds to gateway (beyond status tracking)
- SMS channel as primary (beyond optional future)
- WhatsApp Business API

## Platform

- Redis caching / session store
- Background job queues (Bull/BullMQ) beyond simple expiry job
- Microservices / event-driven architecture
- GraphQL
- Kubernetes / complex orchestration
- Multi-tenant operator orgs

## When to revisit

Introduce Redis/queues when hold expiry or notification volume exceeds reliable in-process + MongoDB patterns. Introduce native apps when web usage and retention justify them. Introduce WhatsApp Business API when operators need automated outbound messaging at scale.
