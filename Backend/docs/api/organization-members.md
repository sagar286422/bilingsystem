# Organization members

Code: `src/routes/organization-member.routes.ts`

Auth: session cookies + `Origin`.

Before POST `.../teams/:teamId/members`, the user must be an organization member. Use this resource first.

---

### Routes

| Method | Path | Who (session) |
|--------|------|----------------|
| GET | `/api/v1/organizations/:organizationId/members` | any org member |
| POST | `/api/v1/organizations/:organizationId/members` | owner or admin |
| PATCH | `/api/v1/organizations/:organizationId/members/:memberId` | owner only (`owner_id`) |
| DELETE | `/api/v1/organizations/:organizationId/members/:memberId` | owner only |

`memberId` is the UUID of the `organization_member` row (from GET list), not the Better Auth `user.id`.

---

### POST — add member

Target user must already exist in Better Auth (signed up at least once). Send exactly one of `user_id` or `email`.

By user id:

```json
{ "user_id": "8SYhDHfMraYtCzqTngMUkTfYQd184zVy" }
```

By email (matched lowercase):

```json
{ "email": "teammate@example.com" }
```

Response `201`: `organization_member` with nested `user`. New members default to role `member`.

Errors: `403 ORG_OWNER_REQUIRED` on POST if you are only `member`; `404 USER_NOT_FOUND`; `409 ALREADY_ORG_MEMBER`; `400 VALIDATION_ERROR` if both or neither id/email.

---

### PATCH — change role (owner only)

Body:

```json
{ "role": "admin" }
```

Allowed values: `admin`, `member` only. You cannot change the membership row for `organization.owner_id` via this API.

---

### DELETE — remove member (owner only)

Response `204`. Cannot remove the organization owner from the org.

---

### GET — list

Returns all members with `role` and nested `user` `{ id, name, email }`.

---

### Postman flow (second user → team)

1. User B signs up (`POST /api/auth/sign-up/email`) in a separate cookie jar or client.

2. User A (owner) signs in.

3. POST `.../organizations/{{orgId}}/members` with B’s `user_id` or `email`.

4. POST `.../organizations/{{orgId}}/teams/{{teamId}}/members` with `{ "user_id": "B's user id" }`.

5. To test admin: owner PATCH `.../members/{{memberRowId}}` with `{ "role": "admin" }`; sign in as B and retry writes.

Token-based email invites (sign-up from link) are not implemented yet.
