# Approach From Step 1

This document describes the order of work and technical approach for building the billing backend, starting from the first step. It follows **Phase 0** in `Phase wise System.txt` before any billing features.

---

## 1. Lock the stack and skeleton

- **Runtime:** Node.js with TypeScript.
- **HTTP:** Fastify (one app entrypoint, structured plugins: `db`, `auth`, `routes`, `security`).
- **Database:** PostgreSQL with a migration tool (Drizzle or Prisma—pick one and keep migrations versioned).
- **Auth:** Better Auth with the official Fastify integration pattern (catch-all route, CORS, `trustedOrigins` aligned with the dashboard origin).

Deliverable: server boots, health check route, database connects, config read from environment (no secrets in code).

---

## 2. Environment and safety

- Define required variables early: database URL, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (or app base URL), OAuth client IDs for Google, optional `CLIENT_ORIGIN` for CORS.
- Use `.env` locally; document required keys in a single place (example file without real values).
- Decide naming for **test vs live** early (matches API key environments in Phase 0.6).

---

## 3. Database order of creation

Apply schemas in an order that respects foreign keys and avoids circular pain:

1. **Better Auth tables** — generate or apply the schema Better Auth expects for users, sessions, accounts, verification, etc. Treat this as the source of truth for identity rows your app references by `user.id`.
2. **Organizations** — `organization` rows linked to an owner user (or membership table if you prefer many owners later).
3. **Companies** — always `organization_id`; legal entity fields (country, currency, tax, gateway default).
4. **Teams** — `organization_id`, optional `company_id`, `type` (geo / product / custom).
5. **RBAC** — `roles`, `permissions`, `role_permissions`, then `user_roles` with `scope_type` and `scope_id` (org / company / team).
6. **API keys** — store **hash only**, plus prefix, environment, organization_id, optional permission scope JSON.
7. **Audit logs** — append-only table; index by org and time for later dashboards.

Deliverable: every table has clear ownership (which phase uses it) and indexes on foreign keys you will filter by every request.

---

## 4. Better Auth first, then bridge to your tenant model

- Mount Better Auth routes under a fixed prefix (for example `/api/auth/*`).
- Enable email/password and Google as in your requirements.
- After sign-in, your app logic ensures the user has or creates an **organization** membership (invite flow can come next; minimal path is “create org on first login” or explicit endpoint).
- **Session auth** is for humans (dashboard). **API keys** are for programmatic access; they resolve to an `organization_id` and optional scope before RBAC runs.

Do not duplicate the user table—extend with your org/company/team tables only.

---

## 5. Access control engine (thin slice, then harden)

Implement one pipeline used by all protected business routes:

1. Identify **principal**: session user or valid API key.
2. Resolve **organization** (from session membership or key).
3. Load **effective roles** for that user at org, company, and team scopes (union or most-specific-wins—document the rule).
4. Check **permission** for resource + action (for example `customers:read`).
5. If the route is company- or team-scoped, verify the principal’s scope includes that `company_id` or `team_id`.

Start with a small permission set (org Admin only) and grow the matrix as you add routes.

---

## 6. Minimal HTTP surface before billing

Ship a small, testable API surface:

- Organization CRUD or create + list for the current user.
- Company CRUD under org (enforce org isolation).
- Team CRUD and membership assignment; support “copy user between teams” as duplicate membership rows, not moving identity.
- Optional: invite tokens or email later; first version can be “add user by email” if you already have users in Better Auth.

---

## 7. Observability and audit from day one

- Structured logging (request id, org id when known, user or key id).
- Write **audit log** entries on sensitive actions (org created, role changed, API key created).
- Keep webhook and payment idempotency keys in mind even now (design tables so you can add `idempotency_key` later without painful migrations).

---

## 8. Only then: Phase 1 billing

After Phase 0 is stable:

- Products and **versioned** prices (immutable price rows; new row per change).
- Customers scoped to `company_id`.
- Checkout session abstraction, then transaction + invoice records and gateway webhooks.

This ordering prevents rework: billing entities always have a correct **company** and **org** context.

---

## 9. How this differs from the note in Phase doc

`Phase wise System.txt` suggests NestJS for the API; you chose **Fastify**. The **phases and data model stay the same**; only the framework layout (modules vs Fastify plugins) changes.

---

## Summary

**Step 1** is not “build checkout.” It is: **Postgres + Better Auth on Fastify + org / company / team + dynamic RBAC + API keys + audit + one consistent authz pipeline.** Everything in Phase 1 and later hangs off that foundation.
