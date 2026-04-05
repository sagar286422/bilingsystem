import { apiFetch, readApiError } from "@/lib/api/http";

export function customersQueryKey(
  organizationId: string | undefined,
  companyId: string | undefined,
) {
  return ["customers", organizationId ?? "_", companyId ?? "_"] as const;
}

export type CustomerDto = {
  object: "customer";
  id: string;
  organization_id: string;
  company_id: string;
  email: string;
  name: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type PurchaseActivityLine = {
  object: "purchase_activity";
  transaction_id: string;
  status: string;
  amount: number;
  currency: string;
  gateway: string;
  gateway_order_id: string;
  created_at: string;
  product_id: string | null;
  product_name: string | null;
  price_id: string | null;
  payment_page: { slug: string; title: string | null } | null;
  razorpay_payment_id?: string | null;
  subscription_id?: string;
  subscription_status?: string;
  invoice_id?: string;
  invoice_status?: string;
};

export type PurchaseSummary = {
  transaction_count: number;
  succeeded_count: number;
  last_succeeded_at: string | null;
  last_product_name: string | null;
  recent_activity: PurchaseActivityLine[];
};

export type CustomerWithSummaryDto = CustomerDto & {
  purchase_summary: PurchaseSummary;
};

export type CustomerWithTransactionsDto = CustomerDto & {
  transactions: PurchaseActivityLine[];
};

export type CustomerListResponse = {
  object: "list";
  data: CustomerWithSummaryDto[];
  has_more: boolean;
};

export type CreateCustomerBody = {
  email: string;
  name?: string | null;
};

function companyCustomersPath(organizationId: string, companyId: string) {
  return `/api/v1/organizations/${encodeURIComponent(organizationId)}/companies/${encodeURIComponent(companyId)}/customers`;
}

function customerPath(
  organizationId: string,
  companyId: string,
  customerId: string,
  expand?: "transactions",
) {
  const base = `${companyCustomersPath(organizationId, companyId)}/${encodeURIComponent(customerId)}`;
  return expand ? `${base}?expand=${expand}` : base;
}

export async function listCustomers(
  organizationId: string,
  companyId: string,
): Promise<CustomerListResponse> {
  const res = await apiFetch(companyCustomersPath(organizationId, companyId));
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<CustomerListResponse>;
}

export async function createCustomer(
  organizationId: string,
  companyId: string,
  body: CreateCustomerBody,
): Promise<CustomerDto> {
  const res = await apiFetch(companyCustomersPath(organizationId, companyId), {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<CustomerDto>;
}

export async function getCustomer(
  organizationId: string,
  companyId: string,
  customerId: string,
  options?: { expandTransactions?: boolean },
): Promise<CustomerDto | CustomerWithTransactionsDto> {
  const path = customerPath(
    organizationId,
    companyId,
    customerId,
    options?.expandTransactions ? "transactions" : undefined,
  );
  const res = await apiFetch(path);
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<CustomerDto | CustomerWithTransactionsDto>;
}
