# Transactions

Code: `src/routes/transaction.routes.ts`

Auth:
- GET: any org member (session) or valid `sk_...` for the same org

All routes are nested under:
`/api/v1/organizations/:organizationId/companies/:companyId`

---

Routes

| Method | Path |
|--------|------|
| GET | `/api/v1/organizations/:organizationId/companies/:companyId/transactions` |
| GET | `/api/v1/organizations/:organizationId/companies/:companyId/transactions/:transactionId` |

