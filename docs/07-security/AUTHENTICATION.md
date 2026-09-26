# Authentication

## Tokens

| Token | Lifetime (default) | Storage |
|-------|--------------------|---------|
| Access JWT | 15m (`JWT_ACCESS_EXPIRES`) | Client memory / memory+session |
| Refresh JWT | 7d (`JWT_REFRESH_EXPIRES`) | Client; server stores hash on User |

## Claims

Access payload: `{ sub: userId, role, type: 'access' }`  
Refresh payload: `{ sub: userId, type: 'refresh' }`

## Password

bcrypt/bcryptjs hash with sufficient cost (e.g. 10–12). Never log plaintext.

## Flows

1. Register → hash password → CUSTOMER user → tokens
2. Login → verify → tokens (reject BLOCKED/INACTIVE)
3. Refresh → verify refresh + hash match → rotate tokens
4. Logout → invalidate refresh hash
5. Me → return safe user profile

## Secrets

`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` from env only; different values; never committed.
