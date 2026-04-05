# Organization roles (session users)

Code: `src/lib/org-rbac.ts`, `src/lib/require-org-write.ts`, `src/lib/require-org-owner.ts`

This is org-level access only. The architecture doc also describes company-level and team-level roles; those are not enforced in routes yet.

---

### Roles (stored on `organization_member.role`)

- `owner` — the user who created the org gets a membership row with this role. `organization.owner_id` is the ultimate owner; that user always has full power even if the role string were wrong.

- `admin` — can invite org members, manage API keys, and mutate companies, teams, catalog (products, prices, plans).

- `member` — read-only on org-scoped resources below (list/get). Cannot invite, cannot see API keys, cannot POST/PATCH/DELETE companies, teams, or catalog via session.

Unknown role strings are treated like `member` for write checks.

---

### Who can do what (session + cookies)

| Action | owner (`owner_id`) | admin | member |
|--------|-------------------|-------|--------|
| GET org, list/get companies, teams, products, prices, plans, customers, subscriptions, invoices, transactions, promo codes | yes | yes | yes |
| POST/PATCH/DELETE companies, teams, team members | yes | yes | no |
| POST/PATCH/DELETE products, prices, plans, and POST customers + subscriptions, create/revoke promo codes | yes | yes | no |
| List/create/revoke API keys | yes | yes | no |
| POST invite org member | yes | yes | no |
| PATCH org member role, DELETE org member | yes | no | no |

---

### Secret key (`sk_`) on write routes

Products, prices, plans, and also POST routes for customers/subscriptions: `Bearer sk_...` is treated as full write access for that org (integration servers). Session role does not apply when the request is authenticated with a valid secret key.

---

### Promoting an admin (testing flow)

1. Sign in as org owner (creator).

2. Invite a user: `POST /api/v1/organizations/:organizationId/members` with `user_id` or `email`.

3. From the GET members list, copy the invited row `id` (membership id, not Better Auth user id).

4. `PATCH /api/v1/organizations/:organizationId/members/:memberId` with body `{ "role": "admin" }` (owner only).

5. Sign in as that user and confirm: they can POST a company; they cannot PATCH another member’s role.

---

### Error codes

- `403` + `ORG_WRITE_REQUIRED` — session user is `member` (or not owner/admin) on a write route.

- `403` + `ORG_OWNER_REQUIRED` — action requires `organization.owner_id` (change/remove members).
