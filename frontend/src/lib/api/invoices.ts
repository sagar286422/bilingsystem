import { apiFetch, readApiError } from "@/lib/api/http";

export function invoicesQueryKey(
  organizationId: string | undefined,
  companyId: string | undefined,
) {
  return ["invoices", organizationId ?? "_", companyId ?? "_"] as const;
}

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
  customer: { id: string; email: string; name: string | null };
};

export type InvoiceListResponse = {
  object: "list";
  data: InvoiceDto[];
  has_more: boolean;
};

function companyInvoicesPath(organizationId: string, companyId: string) {
  return `/api/v1/organizations/${encodeURIComponent(organizationId)}/companies/${encodeURIComponent(companyId)}/invoices`;
}

export async function listInvoices(
  organizationId: string,
  companyId: string,
): Promise<InvoiceListResponse> {
  const res = await apiFetch(companyInvoicesPath(organizationId, companyId));
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<InvoiceListResponse>;
}

export type CreateInvoiceBody = {
  customer_id: string;
  currency: string;
  subtotal_amount: number;
  discount_amount?: number;
  total_amount: number;
  status?: string;
  subscription_id?: string | null;
  promo_code_id?: string | null;
};

export async function createInvoice(
  organizationId: string,
  companyId: string,
  body: CreateInvoiceBody,
): Promise<InvoiceDto> {
  const res = await apiFetch(companyInvoicesPath(organizationId, companyId), {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<InvoiceDto>;
}

export async function patchInvoice(
  organizationId: string,
  companyId: string,
  invoiceId: string,
  body: { status: string },
): Promise<InvoiceDto> {
  const res = await apiFetch(
    `${companyInvoicesPath(organizationId, companyId)}/${encodeURIComponent(invoiceId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<InvoiceDto>;
}
