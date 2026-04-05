# Teams

Code: `src/routes/team.routes.ts`

Auth: session + `Origin` + membership in `:organizationId`.

---

### Read vs write

- GET routes (teams and team members): any org member.

- POST / PATCH / DELETE on teams and team membership: owner or admin only (`403 ORG_WRITE_REQUIRED` for `member`).

See `rbac.md`.

---

### Routes

| Method | Path |
|--------|------|
| POST | `/api/v1/organizations/:organizationId/teams` |
| GET | `/api/v1/organizations/:organizationId/teams` |
| GET | `/api/v1/organizations/:organizationId/teams/:teamId` |
| PATCH | `/api/v1/organizations/:organizationId/teams/:teamId` |
| DELETE | `/api/v1/organizations/:organizationId/teams/:teamId` |
| POST | `/api/v1/organizations/:organizationId/teams/:teamId/members` |
| GET | `/api/v1/organizations/:organizationId/teams/:teamId/members` |
| DELETE | `/api/v1/organizations/:organizationId/teams/:teamId/members/:userId` |

---

### POST — create team

```json
{
  "name": "India Billing Team",
  "type": "geo",
  "company_id": "optional-company-uuid-in-same-org"
}
```

`type` must be one of: `geo`, `product`, `custom`. If `company_id` is set, that company must belong to the same `organizationId`.

---

### PATCH

```json
{
  "name": "India Billing",
  "type": "product",
  "company_id": null
}
```

---

### Team members

POST `.../teams/:teamId/members` — **one of**:

**A) Existing user (already in the organization)**

```json
{ "user_id": "better-auth-user-id" }
```

- User must already be an org member (add via `organization-members.md` first if they signed up separately).

- New `team_member` rows get `role` **`viewer`** by default (stored on `team_member.role`).

**B) Create login + org membership + team membership in one step**

```json
{
  "email": "new.colleague@company.com",
  "password": "min-8-chars",
  "name": "Optional display name"
}
```

- Creates a Better Auth user with email/password (same tables as self-service sign-up) so they can sign in at the normal login page.

- Adds an `organization_member` row with org role **`member`**.

- Adds them to the team with **`viewer`** team role.

- If the email already exists → `409` `USER_EMAIL_EXISTS`.

Duplicate team add → `409` `ALREADY_TEAM_MEMBER`.

GET `.../members` returns `team_member` rows with `role` and nested `user`.

DELETE `.../members/:userId` → `204`.

---

### Errors

| Code | When |
|------|------|
| `USER_NOT_IN_ORGANIZATION` | `user_id` not in org |
| `USER_EMAIL_EXISTS` | `email`+`password` invite but email already registered |
| `TEAM_NOT_FOUND` | invalid team or wrong org |
| `VALIDATION_ERROR` | bad `type` or `company_id` |
| `ORG_WRITE_REQUIRED` | member attempted a write |
