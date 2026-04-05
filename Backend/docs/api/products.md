# Products & prices (catalog)

Code: `src/routes/product.routes.ts`, `src/routes/price.routes.ts`

---

### Auth

Same `organizationId` in the URL must match the caller.

- Dashboard: session cookies + `Origin` + org membership.

- Server: `Authorization: Bearer sk_...` or `sk_live_...` for that org.

`pk_...` in `Authorization` on these routes → `401` `PUBLISHABLE_KEY_NOT_ALLOWED`.

---

### Session vs `sk_` and roles

- GET (list/get products and prices): any org member, or valid `sk_`.

- POST / PATCH / DELETE products; POST / PATCH prices: owner or admin, or valid `sk_`. Plain `member` with session alone gets `403` `ORG_WRITE_REQUIRED`.

Plans live under `plans.md`.

---

## Products

### POST `/api/v1/organizations/:organizationId/products`

```json
{
  "name": "Pro plan",
  "description": "For teams",
  "active": true,
  "metadata": { "sku": "pro-001" }
}
```

`metadata` optional object.

Response `201`: `object: "product"` with `id`, `organization_id`, fields, timestamps.

### GET list

`GET /api/v1/organizations/:organizationId/products`

Response `200`: `{ "object": "list", "data": [ ... ], "has_more": false }`

### GET one

`GET /api/v1/organizations/:organizationId/products/:productId`

### PATCH

Any subset of: `name`, `description`, `active`, `metadata`.

### DELETE

`DELETE .../products/:productId` → `204`. Cascades prices in the database.

---

## Prices

Versioned: each POST creates a new row; `version` = previous max + 1. Do not change amounts in place; POST a new price and optionally PATCH old one to `{ "active": false }`.

### POST `/api/v1/organizations/:organizationId/products/:productId/prices`

One-time:

```json
{
  "currency": "USD",
  "unit_amount": 999,
  "type": "one_time"
}
```

Recurring:

```json
{
  "currency": "USD",
  "unit_amount": 2900,
  "type": "recurring",
  "interval": "month",
  "interval_count": 1,
  "trial_days": 14
}
```

- `unit_amount`: integer minor units (e.g. cents).

- `type`: `one_time` or `recurring`.

- Recurring: `interval` required (`month` or `year`); `interval_count` defaults to `1`.

- `billing_scheme` optional, default `fixed`.

### GET list / GET one

Ordered by `version` ascending.

### PATCH (deactivate only)

Body must be exactly:

```json
{ "active": false }
```

---

### Postman with secret key

1. Create `sk_` (owner/admin): `api-keys.md`.

2. GET or POST `{{baseUrl}}/api/v1/organizations/{{orgId}}/products` with Bearer = full secret key; URL org must match key.

3. Wrong org → `403` `API_KEY_ORG_MISMATCH`.
