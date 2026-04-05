# API keys (`sk_` / `pk_`)

Code: `src/routes/api-key.routes.ts`

Session routes here require cookies + `Origin`. List/create/revoke keys: owner or admin only (not plain `member`). See `rbac.md`.

---

### Secret vs publishable

| | Secret `sk_` | Publishable `pk_` |
|---|--------------|-------------------|
| Where | Server only (env, secrets manager). Never ship in frontends. | Intended for browser/client flows later; treat as public. |
| Today | `GET /api/v1/whoami` and catalog writes with `Authorization: Bearer sk_...`. | Stored and listed; not accepted on those server routes. `pk_` as Bearer → `401` `PUBLISHABLE_KEY_NOT_ALLOWED`. |

Rule: server-only automation → `sk_`. Public clients → `pk_` only on endpoints you explicitly design for that.

---

### Developer flow

1. Create a secret key: POST `.../organizations/:organizationId/api-keys` with `"kind": "secret"`. Copy `secret` once.

2. Verify: GET `/api/v1/whoami` with `Authorization: Bearer <full sk_...>`.

3. Call catalog APIs with the same header; `organizationId` in the URL must match the key’s org.

4. Dashboard users can use session cookies on the same catalog URLs instead of Bearer (role rules apply to session; `sk_` bypasses member read-only on catalog).

---

### POST — create

`POST /api/v1/organizations/:organizationId/api-keys`

```json
{
  "name": "Production backend",
  "kind": "secret",
  "environment": "test"
}
```

- `kind`: `secret` → `sk_test_...` / `sk_live_...`; `publishable` → `pk_...` (not for server auth today).

- `environment`: `test` or `live`.

Response `201`: includes `secret` (full string) once; DB keeps hash + prefix only.

---

### GET — list

`GET /api/v1/organizations/:organizationId/api-keys`

Masked rows: `id`, `name`, `kind`, `environment`, `prefix`, `revoked_at`. No full secret.

---

### DELETE — revoke

`DELETE /api/v1/organizations/:organizationId/api-keys/:apiKeyId`

Response `204`.

---

### GET `/api/v1/whoami`

No cookies required. Header: `Authorization: Bearer sk_test_...` (full key).

Response `200` example:

```json
{
  "object": "api_key_context",
  "organization_id": "...",
  "api_key_id": "...",
  "name": "Production backend",
  "kind": "secret",
  "environment": "test"
}
```

Invalid or revoked key → `401` `INVALID_API_KEY`.

---

### Postman

1. Sign in as owner or admin.

2. POST `.../organizations/{{orgId}}/api-keys`; copy `secret`.

3. New request: GET `{{baseUrl}}/api/v1/whoami` with Bearer token = full `sk_...` (optional: no cookies).

---

### Security

- Stored value is SHA-256 hash of the full key.

- Revoked keys fail verification immediately.
