# API routes — methods and JSON examples

Replace the base URL with your server (local example: `http://localhost:3000`).

Send **`Content-Type: application/json`** on POST bodies unless noted.

Session routes rely on **cookies** returned by sign-up / sign-in. With `curl`, use a cookie jar: `-c cookies.txt -b cookies.txt`.

---

## Implemented in this repository (quick index)

Use this table so you know what is **actually wired in code** today vs Better Auth’s generic surface.

| Layer | Method | Full path | Auth | Details in this file |
|-------|--------|-----------|------|----------------------|
| **Billing API (Fastify)** | GET | `/health` | No | **§1.1** |
| **Billing API (Fastify)** | GET | `/api/me` | Session cookie | **§1.2** |
| **Billing API (Fastify)** | POST | `/api/v1/organizations` | Session cookie | **§1.3** |
| **Billing API (Fastify)** | GET | `/api/v1/organizations` | Session cookie | **§1.3** |
| **Billing API (Fastify)** | GET | `/api/v1/organizations/:organizationId` | Session cookie | **§1.3** + `docs/api/organizations.md` |
| **Billing API (Fastify)** | GET | `/api/v1/whoami` | **`Authorization: Bearer sk_...`** (secret key) | **`docs/api/api-keys.md`** |
| **Billing API (Fastify)** | POST, GET, DELETE | `/api/v1/organizations/:organizationId/api-keys` | Session: owner or admin (see `docs/api/rbac.md`) | **`docs/api/api-keys.md`** |
| **Billing API (Fastify)** | GET, POST, PATCH, DELETE | `/api/v1/organizations/:organizationId/members` (+ `/:memberId`) | GET: any member; POST: owner or admin; PATCH/DELETE: owner only | **`docs/api/organization-members.md`** |
| **Billing API (Fastify)** | POST, GET, PATCH, DELETE | `/api/v1/organizations/:organizationId/companies` (+ `/:companyId`) | GET: any member; writes: owner or admin | **`docs/api/companies.md`** |
| **Billing API (Fastify)** | POST, GET, PATCH, DELETE | `/api/v1/organizations/:organizationId/teams` (+ `/:teamId`, `/members`) | GET: any member; writes: owner or admin | **`docs/api/teams.md`** |
| **Billing API (Fastify)** | POST, GET, PATCH, DELETE | `/api/v1/organizations/:organizationId/products` (+ `/:productId`) | GET: member or `sk_`; writes: owner/admin or `sk_` | **`docs/api/products.md`** |
| **Billing API (Fastify)** | POST, GET, PATCH | `/api/v1/organizations/:organizationId/products/:productId/prices` (+ `/:priceId`) | Same as products | **`docs/api/products.md`** |
| **Billing API (Fastify)** | POST, GET, PATCH, DELETE | `/api/v1/organizations/:organizationId/plans` (+ `/:planId`) | Same as products | **`docs/api/plans.md`** |
| **Billing API (Fastify)** | POST | `/api/v1/organizations/:organizationId/companies/:companyId/customers` | owner/admin writes; members can read via GET | **`docs/api/customers.md`** |
| **Billing API (Fastify)** | GET | `/api/v1/organizations/:organizationId/companies/:companyId/customers` (+ `/:customerId`) | member reads; owner/admin writes | **`docs/api/customers.md`** |
| **Billing API (Fastify)** | POST | `/api/v1/organizations/:organizationId/companies/:companyId/customers/:customerId/subscriptions` | owner/admin writes; member reads via GET | **`docs/api/subscriptions.md`** |
| **Billing API (Fastify)** | GET | `/api/v1/organizations/:organizationId/companies/:companyId/customers/:customerId/subscriptions` (+ `/:subscriptionId`) | member reads; owner/admin writes | **`docs/api/subscriptions.md`** |
| **Billing API (Fastify)** | GET | `/api/v1/organizations/:organizationId/companies/:companyId/invoices` (+ `/:invoiceId`) | member reads | **`docs/api/invoices.md`** |
| **Billing API (Fastify)** | GET | `/api/v1/organizations/:organizationId/companies/:companyId/transactions` (+ `/:transactionId`) | member reads | **`docs/api/transactions.md`** |
| **Billing API (Fastify)** | POST, GET, DELETE | `/api/v1/organizations/:organizationId/promo-codes` | GET: member; writes: owner/admin or `sk_...` | **`docs/api/promo-codes.md`** |
| **Better Auth** | GET, POST | `/api/auth/*` | Varies by sub-route | **§2** (examples) + **§3** (table) |

**Per-feature route files (code):** `health.routes.ts`, `session.routes.ts`, `organization.routes.ts`, `organization-member.routes.ts`, `company.routes.ts`, `team.routes.ts`, `api-key.routes.ts`, `product.routes.ts`, `price.routes.ts`, `plan.routes.ts`, `customer.routes.ts`, `subscription.routes.ts`, `invoice.routes.ts`, `transaction.routes.ts`, `promo-code.routes.ts`, `auth.routes.ts` (under `src/routes/`). Index: `docs/api/README.md`.

**Note:** Organizations are **not** part of sign-up JSON. After sign-up/sign-in, call **`POST /api/v1/organizations`**, then companies/teams under **`/organizations/:organizationId/...`**.

**RBAC:** org-level `owner` / `admin` / `member` is enforced on session routes (see `docs/api/rbac.md`). Company/team-scoped roles from the architecture doc are not implemented yet. Audit logs / `X-Organization-Id` — see **§4**.

---

### Postman

Better Auth expects an **`Origin`** header on many POSTs (especially when cookies are sent). Postman does **not** send `Origin` by default, which causes **`MISSING_OR_NULL_ORIGIN`**.

1. Open your request → **Headers**.
2. Add:
   - **`Origin`** → `http://localhost:3000` (same host/port as your API, or your real frontend URL if it is in `trustedOrigins` / `CLIENT_ORIGIN`).
3. Under **Settings** for the request or collection, turn **on** “Send cookies” / use the **Cookies** link under the URL bar to allow the session cookie to be stored and resent after sign-up or sign-in.
4. Optional but helpful: add **`Referer`** with the same URL as `Origin` if anything still complains.

Use the **same Postman tab** (or collection with shared cookie jar) for sign-up → sign-in → `/api/me` so cookies carry over.

---

## 1. Routes defined in this Fastify app

### 1.1 Health

| Method | Path |
|--------|------|
| GET | `/health` |

**Response 200 (JSON)**

```json
{
  "ok": true,
  "service": "billing-api"
}
```

**Example**

```bash
curl -s http://localhost:3000/health
```

---

### 1.2 Current session (wrapper around Better Auth)

| Method | Path |
|--------|------|
| GET | `/api/me` |

Uses the same session cookies as Better Auth. No body.

**Response 200 (JSON)** — shape matches Better Auth session (illustrative)

```json
{
  "session": {
    "id": "sess_...",
    "userId": "...",
    "expiresAt": "2025-01-01T12:00:00.000Z",
    "token": "..."
  },
  "user": {
    "id": "...",
    "email": "you@example.com",
    "name": "Your Name",
    "emailVerified": false,
    "image": null,
    "createdAt": "2025-01-01T10:00:00.000Z",
    "updatedAt": "2025-01-01T10:00:00.000Z"
  }
}
```

**Response 401 (JSON)** — not signed in

```json
{
  "error": "Unauthorized"
}
```

**Example** (after sign-in, reuse cookies)

```bash
curl -s -b cookies.txt http://localhost:3000/api/me
```

---

### 1.3 Organizations (`/api/v1/organizations`)

**Requires a signed-in session** (same cookies as Better Auth). In Postman: reuse cookies after sign-in and set **`Origin: http://localhost:3000`**.

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/organizations` | Create org; you become **owner** and a membership row is created |
| GET | `/api/v1/organizations` | List orgs you belong to |
| GET | `/api/v1/organizations/:organizationId` | Get one org if you are a member |

**POST `/api/v1/organizations` — request body**

```json
{
  "name": "Acme Billing"
}
```

**Response 201 (JSON)**

```json
{
  "object": "organization",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Acme Billing",
  "owner_id": "user-id-from-better-auth",
  "created_at": "2025-01-15T10:00:00.000Z",
  "updated_at": "2025-01-15T10:00:00.000Z",
  "membership_role": "owner"
}
```

**GET `/api/v1/organizations` — response 200 (JSON)**

```json
{
  "object": "list",
  "data": [
    {
      "object": "organization",
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Acme Billing",
      "owner_id": "user-id-from-better-auth",
      "created_at": "2025-01-15T10:00:00.000Z",
      "updated_at": "2025-01-15T10:00:00.000Z",
      "membership_role": "owner"
    }
  ],
  "has_more": false
}
```

**Errors**

- **401** — no session (same shape as `/api/me`).
- **400** — validation, e.g. missing `name` (`code`: `VALIDATION_ERROR`).
- **404** — `GET .../:organizationId` when not a member (`code`: `ORGANIZATION_NOT_FOUND`).

**Postman order**

1. Sign up or sign in (cookies saved).
2. **POST** `http://localhost:3000/api/v1/organizations` with body `{ "name": "My Org" }`, headers `Content-Type: application/json`, `Origin: http://localhost:3000`.
3. **GET** `http://localhost:3000/api/v1/organizations` with same cookies + `Origin`.
4. **GET** `http://localhost:3000/api/v1/organizations/<id>` with same cookies + `Origin`.

---

## 2. Better Auth — base path `/api/auth`

These are handled by the **`/api/auth/*`** catch-all (GET and POST). Paths below are **relative to the base**; full path = base + `/api/auth` + path.

Example: sign-in = `POST http://localhost:3000/api/auth/sign-in/email`

---

### 2.1 Sign up (email + password)

| Method | Path |
|--------|------|
| POST | `/api/auth/sign-up/email` |

**Request body (JSON)**

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "your-secure-password",
  "image": "https://example.com/avatar.png",
  "callbackURL": "https://yourapp.com/verified",
  "rememberMe": true
}
```

Only **`name`**, **`email`**, and **`password`** are required. Omit `image`, `callbackURL`, `rememberMe` if unused.

**Response 200 (JSON)** — typical success when session is created (exact fields can vary by config)

```json
{
  "token": "session-token-or-null",
  "user": {
    "id": "...",
    "email": "ada@example.com",
    "name": "Ada Lovelace",
    "emailVerified": false,
    "image": null,
    "createdAt": "2025-01-01T10:00:00.000Z",
    "updatedAt": "2025-01-01T10:00:00.000Z"
  }
}
```

**Example**

```bash
curl -s -c cookies.txt -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","password":"your-secure-password"}'
```

---

### 2.2 Sign in (email + password)

| Method | Path |
|--------|------|
| POST | `/api/auth/sign-in/email` |

**Request body (JSON)**

```json
{
  "email": "ada@example.com",
  "password": "your-secure-password",
  "callbackURL": "https://yourapp.com/after-verify",
  "rememberMe": true
}
```

Required: **`email`**, **`password`**.

**Response 200 (JSON)** — illustrative

```json
{
  "redirect": false,
  "token": "...",
  "url": null,
  "user": {
    "id": "...",
    "email": "ada@example.com",
    "name": "Ada Lovelace",
    "emailVerified": false,
    "image": null,
    "createdAt": "2025-01-01T10:00:00.000Z",
    "updatedAt": "2025-01-01T10:00:00.000Z"
  }
}
```

**Example**

```bash
curl -s -c cookies.txt -b cookies.txt -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"email":"ada@example.com","password":"your-secure-password"}'
```

---

### 2.3 Get session (Better Auth)

| Method | Path |
|--------|------|
| GET | `/api/auth/get-session` |
| POST | `/api/auth/get-session` |

**GET** is the usual choice. **POST** may be restricted depending on Better Auth `session.deferSessionRefresh` — if you get method errors, use **GET**.

No body for GET. Send session **cookies** from sign-in.

**Response 200** — signed in (JSON)

```json
{
  "session": {
    "id": "...",
    "userId": "...",
    "expiresAt": "2025-02-01T12:00:00.000Z",
    "token": "..."
  },
  "user": {
    "id": "...",
    "email": "ada@example.com",
    "name": "Ada Lovelace",
    "emailVerified": false,
    "image": null,
    "createdAt": "2025-01-01T10:00:00.000Z",
    "updatedAt": "2025-01-01T10:00:00.000Z"
  }
}
```

**Response 200** — no session: body may be **`null`** (check raw response).

**Example**

```bash
curl -s -b cookies.txt http://localhost:3000/api/auth/get-session
```

---

### 2.4 Sign out

| Method | Path |
|--------|------|
| POST | `/api/auth/sign-out` |

No JSON body required. Clears session cookies when cookies are sent.

**Response 200 (JSON)**

```json
{
  "success": true
}
```

**Example**

```bash
curl -s -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/auth/sign-out
```

---

### 2.5 Sign in with Google (social)

| Method | Path |
|--------|------|
| POST | `/api/auth/sign-in/social` |

Requires **`GOOGLE_CLIENT_ID`** and **`GOOGLE_CLIENT_SECRET`** in `.env`.

**Request body (JSON)** — browser redirect flow (typical)

```json
{
  "provider": "google",
  "callbackURL": "http://localhost:3000/dashboard",
  "errorCallbackURL": "http://localhost:3000/login?error=1"
}
```

**Response 200** — redirect flow (illustrative)

```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "redirect": true
}
```

Then the user opens `url` in a browser; Google redirects back to Better Auth at **`/api/auth/callback/google`** (GET).

---

### 2.6 OAuth callback (browser / Google)

| Method | Path |
|--------|------|
| GET | `/api/auth/callback/:providerId` |

Example: `/api/auth/callback/google`. Not usually called manually with JSON; the provider redirects here with query parameters.

---

## 3. Other Better Auth endpoints (POST unless noted)

Your server forwards them the same way. Bodies are JSON unless documented otherwise on the official API page.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/auth/ok` | Auth service OK check |
| POST | `/api/auth/update-user` | Update profile (session required) |
| POST | `/api/auth/change-password` | Change password (session) |
| POST | `/api/auth/set-password` | Set password when none exists (session) |
| POST | `/api/auth/delete-user` | Delete current user (session) |
| GET | `/api/auth/delete-user/callback` | Delete-user email link callback |
| POST | `/api/auth/change-email` | Start email change (session) |
| POST | `/api/auth/update-session` | Update session fields (session) |
| POST | `/api/auth/list-sessions` | List sessions (session) |
| POST | `/api/auth/revoke-session` | Revoke one session |
| POST | `/api/auth/revoke-sessions` | Revoke many sessions |
| POST | `/api/auth/revoke-other-sessions` | Revoke other devices |
| POST | `/api/auth/request-password-reset` | Request reset email |
| POST | `/api/auth/reset-password` | Apply new password with token |
| POST | `/api/auth/verify-password` | Verify password for sensitive action |
| POST | `/api/auth/send-verification-email` | Resend verification |
| POST | `/api/auth/verify-email` | Verify email with token |
| POST | `/api/auth/list-accounts` | Linked OAuth accounts |
| POST | `/api/auth/link-social` | Link OAuth account |
| POST | `/api/auth/unlink-account` | Unlink OAuth account |
| POST | `/api/auth/get-access-token` | Provider access token |
| POST | `/api/auth/refresh-token` | Refresh provider token |
| POST | `/api/auth/account-info` | Account details |

For exact request shapes and errors, use:

https://www.better-auth.com/docs/concepts/api

---

## 4. Not implemented yet (your billing product)

**Implemented (Phase 0):** organizations (**§1.3**), **companies** and **teams** (nested under org) — see **`docs/api/companies.md`** and **`docs/api/teams.md`**.

**Not implemented yet** (next slices):

| Area | Example path | Purpose |
|------|----------------|---------|
| RBAC | roles / permissions / scoped assignments | Dynamic access control |
| API keys | `POST /api/v1/.../api-keys` | Developer `sk_` / `pk_` style keys |
| Audit logs | internal + optional read API | Compliance trail |
| Org invites | add non-owner users to org | Today only owner membership on org create |
| Active org header | optional `X-Organization-Id` | Alternative to path nesting |
| Phase 1+ | products, prices, customers, checkout, webhooks | Core billing |

When you add each slice, extend this file with methods, paths, and JSON examples.

---

## 5. Errors

Better Auth and Fastify may return JSON like:

```json
{
  "message": "Human readable message",
  "code": "ERROR_CODE"
}
```

Status codes: **400** validation, **401** unauthorized, **404** not found, **422** business rule, **500** server error.

---

## 6. CORS and cookies

- **`CLIENT_ORIGIN`**: browser app origin allowed to call the API with credentials.
- **`BETTER_AUTH_URL`**: must match how the client reaches this API (same scheme, host, port).
- For cross-origin dashboards, use `credentials: 'include'` and a fixed cookie domain policy as you deploy.
