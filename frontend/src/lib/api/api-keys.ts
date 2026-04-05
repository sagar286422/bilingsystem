import { apiFetch, readApiError } from "@/lib/api/http";

export function apiKeysQueryKey(organizationId: string | undefined) {
  return ["api-keys", organizationId ?? "_"] as const;
}

export type ApiKeyDto = {
  object: "api_key";
  id: string;
  organization_id: string;
  name: string;
  kind: "secret" | "publishable";
  environment: "test" | "live";
  prefix: string;
  created_at: string;
  revoked_at: string | null;
  /** Present only once, on create. */
  secret?: string;
  message?: string;
};

export type ApiKeyListResponse = {
  object: "list";
  data: ApiKeyDto[];
  has_more: boolean;
};

export type CreateApiKeyBody = {
  name: string;
  kind: "secret" | "publishable";
  environment: "test" | "live";
};

function orgKeysBase(organizationId: string) {
  return `/api/v1/organizations/${encodeURIComponent(organizationId)}/api-keys`;
}

export async function listApiKeys(
  organizationId: string,
): Promise<ApiKeyListResponse> {
  const res = await apiFetch(orgKeysBase(organizationId));
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<ApiKeyListResponse>;
}

export async function createApiKey(
  organizationId: string,
  body: CreateApiKeyBody,
): Promise<ApiKeyDto & { message?: string }> {
  const res = await apiFetch(orgKeysBase(organizationId), {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<ApiKeyDto & { message?: string }>;
}

export async function revokeApiKey(
  organizationId: string,
  apiKeyId: string,
): Promise<void> {
  const res = await apiFetch(
    `${orgKeysBase(organizationId)}/${encodeURIComponent(apiKeyId)}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error(await readApiError(res));
}
