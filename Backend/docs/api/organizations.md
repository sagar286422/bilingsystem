# Organizations

Code: `src/routes/organization.routes.ts`

Auth: session cookie + `Origin` (Better Auth). These routes do not use `organizationId` in the path except for GET one org.

---

### Routes

| Method | Path |
|--------|------|
| POST | `/api/v1/organizations` |
| GET | `/api/v1/organizations` |
| GET | `/api/v1/organizations/:organizationId` |

---

### Create

POST `/api/v1/organizations`

Body:

```json
{ "name": "Acme Billing" }
```

You become `organization.owner_id` and get a membership row with role `owner`. Save `id` from the response as `organizationId` for nested URLs.

---

### List / get

- GET `/api/v1/organizations` — orgs you belong to; each item includes `membership_role` (`owner`, `admin`, or `member`).

  **Query (pagination):**

  | Param | Default | Max | Description |
  |-------|---------|-----|-------------|
  | `page` | `1` | — | 1-based page index |
  | `page_size` | `100` | `100` | Rows per page |

  Response includes `total_count`, `page`, `page_size`, and `has_more` (whether another page exists after this one).

- GET `/api/v1/organizations/:organizationId` — must already be a member; returns `membership_role`.

---

### Next steps

Add teammates with `organization-members.md` before adding them to teams.

Response shapes: `API_ROUTES_WITH_JSON.md` §1.3.
