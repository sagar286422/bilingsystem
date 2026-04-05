import { apiFetch, readApiError } from "@/lib/api/http";

export function subscriptionsQueryKey(
  organizationId: string | undefined,
  companyId: string | undefined,
  customerId: string | undefined,
) {
  return [
    "subscriptions",
    organizationId ?? "_",
    companyId ?? "_",
    customerId ?? "_",
  ] as const;
}

export type PriceSummaryDto = {
  id: string;
  product_id: string;
  product_name: string | null;
  currency: string;
  unit_amount: number;
  type: string;
  billing_scheme: string;
  interval: string | null;
  interval_count: number | null;
  trial_days: number | null;
  version: number;
  active: boolean;
};

export type PlanSummaryDto = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  slug: string | null;
  active: boolean;
  metadata: unknown;
  price_id: string;
  created_at: string;
  updated_at: string;
};

export type SubscriptionDto = {
  object: "subscription";
  id: string;
  organization_id: string;
  company_id: string;
  customer_id: string;
  price_id: string;
  plan_id: string | null;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at: string | null;
  latest_invoice_id: string | null;
  created_at: string;
  updated_at: string;
  price?: PriceSummaryDto;
  plan?: PlanSummaryDto | null;
};

export type SubscriptionListResponse = {
  object: "list";
  data: SubscriptionDto[];
  has_more: boolean;
};

export type InvoiceDto = {
  object: "invoice";
  id: string;
  organization_id: string;
  company_id: string;
  customer_id: string;
  subscription_id: string | null;
  promo_code_id: string | null;
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  status: string;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
};

export type TransactionDto = {
  object: "transaction";
  id: string;
  organization_id: string;
  company_id: string;
  customer_id: string;
  subscription_id: string | null;
  invoice_id: string | null;
  amount: number;
  currency: string;
  status: string;
  gateway: string;
  gateway_reference_id: string;
  created_at: string;
  updated_at: string;
};

export type CreateSubscriptionBody = {
  price_id: string;
  plan_id?: string | null;
  quantity?: number;
  promo_code?: string | null;
};

function customerSubscriptionsPath(
  organizationId: string,
  companyId: string,
  customerId: string,
) {
  return `/api/v1/organizations/${encodeURIComponent(organizationId)}/companies/${encodeURIComponent(companyId)}/customers/${encodeURIComponent(customerId)}/subscriptions`;
}

export async function listSubscriptions(
  organizationId: string,
  companyId: string,
  customerId: string,
): Promise<SubscriptionListResponse> {
  const res = await apiFetch(
    customerSubscriptionsPath(organizationId, companyId, customerId),
  );
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<SubscriptionListResponse>;
}

export async function createSubscription(
  organizationId: string,
  companyId: string,
  customerId: string,
  body: CreateSubscriptionBody,
): Promise<{
  subscription: SubscriptionDto;
  latest_invoice: InvoiceDto;
  latest_transaction: TransactionDto;
}> {
  const res = await apiFetch(
    customerSubscriptionsPath(organizationId, companyId, customerId),
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<{
    subscription: SubscriptionDto;
    latest_invoice: InvoiceDto;
    latest_transaction: TransactionDto;
  }>;
}
