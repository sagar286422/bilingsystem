# Promo codes

Code: `src/routes/promo-code.routes.ts`

Promo codes reduce invoice totals when creating a subscription (Phase 1 slice).

Auth:
- GET list: org member (session) or valid `sk_...` for the same org
- POST/DELETE: org owner or admin (session) or valid `sk_...` for the same org

---

Routes

| Method | Path |
|--------|------|
| POST | `/api/v1/organizations/:organizationId/promo-codes` |
| GET | `/api/v1/organizations/:organizationId/promo-codes` |
| DELETE | `/api/v1/organizations/:organizationId/promo-codes/:promoCodeId` |

---

Create promo code

POST `/api/v1/organizations/:organizationId/promo-codes`

Body:

```json
{
  "code": "SUMMER25",
  "name": "Summer discount",
  "kind": "percent_off",
  "percent_off": 25,
  "max_uses": 1000,
  "expires_at": "2026-12-31T00:00:00Z",
  "applies_to_product_id": "<optional product uuid>",
  "applies_to_price_id": "<optional price uuid>"
}
```

Alternative (fixed amount off, in minor currency units):

```json
{
  "code": "WELCOME50",
  "kind": "amount_off",
  "amount_off": 50,
  "max_uses": 100,
  "active": true
}
```

Rules:
- `kind` is `percent_off` or `amount_off`
- For `percent_off`, `percent_off` must be 1..100
- For `amount_off`, `amount_off` must be >= 1 (minor units)
- If `applies_to_price_id` is set, it must match the subscription `price_id`
- If `applies_to_product_id` is set, it must match the subscription `product_id`

Response `201`: returns the promo code object (including `id`, counters, etc.).

---

Revoke

DELETE `/api/v1/organizations/:organizationId/promo-codes/:promoCodeId`

Response `204`.

