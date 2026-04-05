# Customers

Code: `src/routes/customer.routes.ts`

Auth:
- GET routes: org member (session) or valid `sk_...` for the same org
- POST route: org owner or org admin (session), or `sk_...` for the same org

All routes are nested under:
`/api/v1/organizations/:organizationId/companies/:companyId`

---

Routes

| Method | Path |
|--------|------|
| POST | `/api/v1/organizations/:organizationId/companies/:companyId/customers` |
| GET | `/api/v1/organizations/:organizationId/companies/:companyId/customers` |
| GET | `/api/v1/organizations/:organizationId/companies/:companyId/customers/:customerId` |

---

POST create customer

Body:

```json
{
  "email": "buyer@example.com",
  "name": "Buyer Name",
  "metadata": { "source": "landing-page" }
}
```

Notes:
- `email` is required and is unique per company

Response:
- `201` object: `customer`

Errors:
- `404` + `COMPANY_NOT_FOUND` if the company is not in the org
- `409` + `CUSTOMER_EMAIL_ALREADY_EXISTS` if email already exists in that company

