# Subscriptions

Code: `src/routes/subscription.routes.ts`

Auth:
- POST create: org owner or org admin (session), or valid `sk_...` for the same org
- GET list/get: any org member (session), or valid `sk_...` for the same org

All routes are nested under:
`/api/v1/organizations/:organizationId/companies/:companyId/customers/:customerId`

---

Routes

| Method | Path |
|--------|------|
| POST | `/api/v1/organizations/:organizationId/companies/:companyId/customers/:customerId/subscriptions` |
| GET | `/api/v1/organizations/:organizationId/companies/:companyId/customers/:customerId/subscriptions` |
| GET | `/api/v1/organizations/:organizationId/companies/:companyId/customers/:customerId/subscriptions/:subscriptionId` |

---

POST create subscription

This creates:
- a `subscription` with status `active`
- an initial `invoice` with status `paid`
- a `transaction` with status `succeeded`

For now, only `recurring` prices can be used.

Body:

```json
{
  "price_id": "<uuid of recurring price in this org>",
  "plan_id": "<optional uuid of plan in this org>",
  "promo_code": "<optional promo code like SUMMER25>",
  "quantity": 1
}
```

Notes:
- `price_id` must be active and belong to a product in the same organization
- `plan_id` (if provided) must match the same `price_id`
- `promo_code` is optional and supports `percent_off` or `amount_off` promo codes.

If promo code is invalid, expired, not applicable, or max uses are reached, subscription creation fails with `4xx` and the error `code` returned in the response.

Response `201`:

- `subscription`
- `latest_invoice`
- `latest_transaction`

