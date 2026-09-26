# Auth API

## POST /api/auth/register

- **Auth:** None
- **Role:** —
- **Body:** `{ name, email, phone, password }` → creates CUSTOMER
- **Validation:** email format, phone required, password min 8
- **Success 201:** `{ user: { id, name, email, phone, role }, accessToken, refreshToken }`
- **Errors:** 400 VALIDATION_ERROR; 409 email/phone taken

## POST /api/auth/login

- **Auth:** None
- **Body:** `{ email, password }`
- **Success 200:** `{ user, accessToken, refreshToken }`
- **Errors:** 401 AUTH_INVALID_CREDENTIALS; 403 USER_BLOCKED

## POST /api/auth/refresh

- **Auth:** None (refresh token)
- **Body:** `{ refreshToken }`
- **Success 200:** `{ accessToken, refreshToken }`
- **Errors:** 401 AUTH_TOKEN_INVALID / AUTH_TOKEN_EXPIRED

## POST /api/auth/logout

- **Auth:** Bearer access (preferred)
- **Body:** `{ refreshToken }` optional
- **Success 200:** clears stored refresh hash
- **Errors:** 401 AUTH_UNAUTHORIZED

## GET /api/auth/me

- **Auth:** Bearer
- **Role:** any authenticated
- **Success 200:** `{ id, name, email, phone, role, status }`
- **Errors:** 401

### Rate limiting

Apply stricter limits to `register`, `login`, `refresh`.
