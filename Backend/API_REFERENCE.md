# Billing API — route reference

For **full methods + example JSON** (request/response), see **`API_ROUTES_WITH_JSON.md`**.

Base URL: `http://localhost:3000` (or your `BETTER_AUTH_URL` host and `PORT`).

All Better Auth routes live under **`/api/auth/*`**. The list below is the surface you will call from a dashboard or `createAuthClient({ baseURL: "..." })`.

---

## App routes (this service)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness check |
| GET | `/api/me` | Current session (cookie). Returns `401` if not signed in |

---

## Better Auth (mounted at `/api/auth`)

Use the official client or HTTP with cookies / JSON as documented here:

https://www.better-auth.com/docs/basic-usage

Common endpoints (paths are relative to `/api/auth`):

| Area | Example path | Notes |
|------|----------------|-------|
| Session | `GET /api/auth/get-session` | Session for cookie-based clients |
| Email sign-up | `POST /api/auth/sign-up/email` | JSON body: email, password, name |
| Email sign-in | `POST /api/auth/sign-in/email` | JSON body: email, password |
| Google | `GET /api/auth/sign-in/social?provider=google` | Requires `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `.env` |
| Sign out | `POST /api/auth/sign-out` | |

Exact paths can vary slightly by Better Auth version. For an authoritative list, open:

https://www.better-auth.com/docs/concepts/api

Or run the server and inspect network calls from the Better Auth client.

---

## Environment alignment

- **`BETTER_AUTH_URL`** must match the URL where this API is reachable (scheme + host + port), e.g. `http://localhost:3000`.
- **`CLIENT_ORIGIN`** is the browser origin allowed by CORS (comma-separated for multiple). Often the same as the app URL for local dev.

---

## Next (Phase 0)

Planned additions (not implemented yet): organizations, companies, teams, RBAC, API keys, audit logs under something like `/api/v1/...`.
