import { apiFetch, readApiError } from "@/lib/api/http";

export function paymentPagesQueryKey(organizationId: string | undefined) {
  return ["payment-pages", organizationId ?? "_"] as const;
}

export type PaymentPageDto = {
  object: "payment_page";
  id: string;
  organization_id: string;
  company_id: string;
  price_id: string;
  slug: string;
  title: string | null;
  active: boolean;
  company_name: string;
  product_name: string;
  amount_minor: number;
  currency: string;
  price_type: string;
  interval: string | null;
  interval_count: number | null;
  pay_path: string;
  customization: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type PaymentPageListResponse = {
  object: "list";
  data: PaymentPageDto[];
  has_more: boolean;
};

export type CreatePaymentPageBody = {
  slug: string;
  company_id: string;
  price_id: string;
  title?: string | null;
  customization?: Record<string, unknown>;
};

export type PatchPaymentPageBody = {
  title?: string | null;
  active?: boolean;
  customization?: Record<string, unknown>;
};

export async function listPaymentPages(
  organizationId: string,
): Promise<PaymentPageListResponse> {
  const res = await apiFetch(
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/payment-pages`,
  );
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<PaymentPageListResponse>;
}

export async function createPaymentPage(
  organizationId: string,
  body: CreatePaymentPageBody,
): Promise<PaymentPageDto> {
  const res = await apiFetch(
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/payment-pages`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<PaymentPageDto>;
}

export async function patchPaymentPage(
  organizationId: string,
  paymentPageId: string,
  body: PatchPaymentPageBody,
): Promise<PaymentPageDto> {
  const res = await apiFetch(
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/payment-pages/${encodeURIComponent(paymentPageId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<PaymentPageDto>;
}
