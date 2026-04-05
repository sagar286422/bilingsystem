# Companies

Code: `src/routes/company.routes.ts`

Auth: session + `Origin` + membership in `:organizationId`.

---

### Read vs write

- GET routes: any org member (`owner`, `admin`, or `member`).

- POST / PATCH / DELETE: owner or admin only. Pure `member` gets `403` + `ORG_WRITE_REQUIRED`.

See `rbac.md`.

---

### Routes

| Method | Path |
|--------|------|
| POST | `/api/v1/organizations/:organizationId/companies` |
| GET | `/api/v1/organizations/:organizationId/companies` |
| GET | `/api/v1/organizations/:organizationId/companies/:companyId` |
| PATCH | `/api/v1/organizations/:organizationId/companies/:companyId` |
| DELETE | `/api/v1/organizations/:organizationId/companies/:companyId` |
| GET | `/api/v1/organizations/:organizationId/companies/:companyId/members` |
| POST | `/api/v1/organizations/:organizationId/companies/:companyId/members` |
| DELETE | `/api/v1/organizations/:organizationId/companies/:companyId/members/:userId` |

---

### Company members (who can act for this legal entity)

Users must **already** be members of the organization (`organization_member`). Linking them to a company records access in `company_member` (default role `member`).

- **GET** `.../members` — list linked users (any org member).

- **POST** `.../members` — body `{ "user_id": "..." }` (owner/admin only). Duplicate → `409` `ALREADY_COMPANY_MEMBER`. User not in org → `400` `USER_NOT_IN_ORGANIZATION`.

- **DELETE** `.../members/:userId` — unlink (owner/admin only).

---

### POST — create

```json
{
  "name": "ManyTalks India Pvt Ltd",
  "country": "IN",
  "currency": "INR",
  "logo": "https://example.com/logo.png",
  "tax_id": "22AAAAA0000A1Z5",
  "address": "123 Street, Mumbai",
  "default_gateway": "razorpay"
}
```

Required: `name`, `country` (ISO-3166 alpha-2), `currency` (ISO-4217). Optional: `logo`, `tax_id`, `address`, `default_gateway`.

Response `201`: `object: "company"` with `id`, `organization_id`, timestamps.

---

### PATCH

Send only fields to change; use `null` to clear optional fields. Keys are snake_case in examples (`tax_id`, `default_gateway`); some camelCase may be accepted in code.

---

### DELETE

Response `204`.

---

### Errors

| Code | When |
|------|------|
| `401` | Not signed in |
| `403` + `ORG_WRITE_REQUIRED` | member tried a write |
| `404` + `ORGANIZATION_NOT_FOUND` | not a member |
| `404` + `COMPANY_NOT_FOUND` | wrong id or other org |
| `400` + `VALIDATION_ERROR` | invalid body |

---

### Postman

Use `{{orgId}}` from org create/list. Run GET list as a `member` user once to confirm read access, then POST as owner/admin.
