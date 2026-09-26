# Security Checklist

- [ ] Passwords hashed (bcrypt)
- [ ] JWT secrets in env; not in repo
- [ ] Auth + role middleware on protected routes
- [ ] Input validation on all mutating endpoints
- [ ] Rate limit login/register/refresh/payment
- [ ] Helmet security headers
- [ ] CORS restricted to CLIENT_URL
- [ ] Payment signature + webhook verification
- [ ] No trust of client totals / seat availability / payment success
- [ ] Mongo operators not passed raw from user input
- [ ] Errors sanitized (no stacks)
- [ ] Audit logs for admin mutations
- [ ] `.env` gitignored; `.env.example` placeholders only
- [ ] No secrets in client bundle (only public payment key id)
- [ ] Hold/book operations atomic
