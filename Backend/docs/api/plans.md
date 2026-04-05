# Plans (named tier → price)

Code: `src/routes/plan.routes.ts`

A plan is a sellable name (and optional `slug`) attached to exactly one `price_id`. Money and billing cadence stay on `Price` (versioned; only deactivation via PATCH). Plans are what you will later attach subscriptions or checkout to.

---

### Auth

Same as products: session + org membership, or `Bearer sk_...` for that org.

- GET: any member or `sk_`.

- POST / PATCH / DELETE: owner or admin, or `sk_`. Session `member` alone → `403` on writes.

See `products.md` and `rbac.md`.

---

### Typical flow

Create product → add price (often recurring) → create plan with `price_id` → (future) subscription/checkout.

---

### POST `/api/v1/organizations/:organizationId/plans`

```json
{
  "name": "Pro",
  "description": "For growing teams",
  "slug": "pro",
  "price_id": "<uuid of price in this org>",
  "active": true,
  "metadata": { "features": ["sso", "audit"] }
}
```

- `price_id` required; price must be in this org and `active: true`.

- `slug` optional; lowercase letters, digits, hyphens; unique per org.

Response `201`: `object: "plan"` with nested `price` summary (`product_name`, `unit_amount`, `type`, `interval`, …).

Errors: `404 PRICE_NOT_FOUND`, `400 PRICE_INACTIVE`, `409 PLAN_SLUG_TAKEN`.

---

### GET list

`GET /api/v1/organizations/:organizationId/plans`

---

### GET one

`GET /api/v1/organizations/:organizationId/plans/:planId`

---

### PATCH

Subset of: `name`, `description`, `slug` (or `null` to clear), `active`, `metadata`, `price_id` (new active price in same org).

---

### DELETE

`DELETE .../plans/:planId` → `204`. Does not delete product or price rows.

---

### Notes

- Deleting a product cascades to prices and then plans that pointed at those prices.

- Recurring prices are the usual choice for subscription-style plans.
