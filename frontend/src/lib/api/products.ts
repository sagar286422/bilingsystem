import { apiFetch, readApiError } from "@/lib/api/http";

export function productsQueryKey(organizationId: string | undefined) {
  return ["products", organizationId ?? "_"] as const;
}

export type ProductDto = {
  object: "product";
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ProductListResponse = {
  object: "list";
  data: ProductDto[];
  has_more: boolean;
};

function orgBase(organizationId: string) {
  return `/api/v1/organizations/${encodeURIComponent(organizationId)}`;
}

export async function listProducts(
  organizationId: string,
): Promise<ProductListResponse> {
  const res = await apiFetch(`${orgBase(organizationId)}/products`);
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<ProductListResponse>;
}

export type CreateProductBody = {
  name: string;
  description?: string | null;
  active?: boolean;
};

export async function createProduct(
  organizationId: string,
  body: CreateProductBody,
): Promise<ProductDto> {
  const res = await apiFetch(`${orgBase(organizationId)}/products`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<ProductDto>;
}
