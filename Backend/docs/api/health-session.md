# Health & session helper

Code: `src/routes/health.routes.ts`, `src/routes/session.routes.ts`

---

### GET `/health`

- No auth.

- Use to verify the API process is up before running the rest of a Postman collection.

---

### GET `/api/me`

- Optional session: sends cookies if you have them.

- Returns the current Better Auth session user when signed in; useful right after sign-in to copy `user.id` for team/org member bodies.

- If not signed in, response is typically empty or null session (depends on Better Auth handler — see `API_ROUTES_WITH_JSON.md` §1.2).

---

### Postman

- Create an environment variable `baseUrl` = `http://localhost:3000` (or your host).

- First request: `GET {{baseUrl}}/health`

- After `POST /api/auth/sign-in/email`, call `GET {{baseUrl}}/api/me` with the same cookie jar.
