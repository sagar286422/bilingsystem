import { apiFetch, readApiError } from "@/lib/api/http";

export function pricesQueryKey(
  organizationId: string | undefined,
  productId: string | undefined,
) {
  return ["prices", organizationId ?? "_", productId ?? "_"] as const;
}

export type PriceDto = {
  object: "price";
  id: string;
  product_id: string;
  currency: string;
  unit_amount: number;
  type: string;
  billing_scheme: string;
  interval: string | null;
  interval_count: number | null;
  trial_days: number | null;
  version: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type PriceListResponse = {
  object: "list";
  data: PriceDto[];
  has_more: boolean;
};

function productPricesPath(organizationId: string, productId: string) {
  return `/api/v1/organizations/${encodeURIComponent(organizationId)}/products/${encodeURIComponent(productId)}/prices`;
}

export async function listPrices(
  organizationId: string,
  productId: string,
): Promise<PriceListResponse> {
  const res = await apiFetch(productPricesPath(organizationId, productId));
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<PriceListResponse>;
}

export type CreatePriceBody = {
  currency: string;
  unit_amount: number;
  type: "one_time" | "recurring";
  billing_scheme?: string;
  interval?: string;
  interval_count?: number;
  trial_days?: number | null;
};

export async function createPrice(
  organizationId: string,
  productId: string,
  body: CreatePriceBody,
): Promise<PriceDto> {
  const res = await apiFetch(productPricesPath(organizationId, productId), {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<PriceDto>;
}

export async function deactivatePrice(
  organizationId: string,
  productId: string,
  priceId: string,
): Promise<PriceDto> {
  const res = await apiFetch(
    `${productPricesPath(organizationId, productId)}/${encodeURIComponent(priceId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ active: false }),
    },
  );
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<PriceDto>;
}
