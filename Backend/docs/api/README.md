# API reference by feature (Postman-friendly)

Base URL example: `http://localhost:3000`.

Most `/api/v1/...` routes need:

- `Content-Type: application/json` on bodies
- `Origin` aligned with Better Auth (e.g. `http://localhost:3000`)
- Session cookies after sign-in

Full auth examples: `API_ROUTES_WITH_JSON.md` in the Backend folder.

Suggested order for manual testing:
`rbac.md` (roles) → `health-session.md` → `organizations.md` → `organization-members.md` → `companies.md` → `teams.md` → `api-keys.md` → `products.md` → `plans.md` → `customers.md` → `subscriptions.md` → `promo-codes.md` → `invoices.md` → `transactions.md`.

| Feature | Route file | Doc |
|---------|------------|-----|
| Health / `GET /api/me` | `health.routes.ts`, `session.routes.ts` | `health-session.md` |
| RBAC overview | `org-rbac.ts`, `require-org-write.ts` | `rbac.md` |
| Organizations | `organization.routes.ts` | `organizations.md` |
| Organization members | `organization-member.routes.ts` | `organization-members.md` |
| Companies | `company.routes.ts` | `companies.md` |
| Teams | `team.routes.ts` | `teams.md` |
| API keys | `api-key.routes.ts` | `api-keys.md` |
| Products & prices | `product.routes.ts`, `price.routes.ts` | `products.md` |
| Plans | `plan.routes.ts` | `plans.md` |
| Customers | `customer.routes.ts` | `customers.md` |
| Subscriptions | `subscription.routes.ts` | `subscriptions.md` |
| Invoices | `invoice.routes.ts` | `invoices.md` |
| Transactions | `transaction.routes.ts` | `transactions.md` |
| Promo codes | `promo-code.routes.ts` | `promo-codes.md` |
| Better Auth | `auth.routes.ts` | `API_ROUTES_WITH_JSON.md` §2–3 |
