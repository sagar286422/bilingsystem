import { apiFetch, readApiError } from "@/lib/api/http";

export type ListOrganizationsParams = {
  page?: number;
  page_size?: number;
};

/** Scope by user id so a new session never reads another user’s cached list. */
export function organizationsQueryKey(
  userId: string | undefined,
  variant:
    | "all"
    | { page: number; page_size: number } = "all",
) {
  if (variant === "all") {
    return ["organizations", userId ?? "_", "all"] as const;
  }
  return [
    "organizations",
    userId ?? "_",
    "page",
    variant.page,
    variant.page_size,
  ] as const;
}

export type OrganizationDto = {
  object: "organization";
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  membership_role?: string;
  payment_mode?: "platform" | "byok_razorpay";
  platform_fee_bps?: number;
  byok_configured?: boolean;
  razorpay_key_id_suffix?: string | null;
};

export type OrganizationListResponse = {
  object: "list";
  data: OrganizationDto[];
  has_more: boolean;
  total_count: number;
  page: number;
  page_size: number;
};

function buildOrganizationsSearch(params?: ListOrganizationsParams): string {
  const search = new URLSearchParams();
  if (params?.page != null) {
    search.set("page", String(params.page));
  }
  if (params?.page_size != null) {
    search.set("page_size", String(params.page_size));
  }
  const q = search.toString();
  return q ? `?${q}` : "";
}

/** Lists organizations the current session user belongs to (server-enforced). */
export async function listOrganizations(
  params?: ListOrganizationsParams,
): Promise<OrganizationListResponse> {
  const res = await apiFetch(
    `/api/v1/organizations${buildOrganizationsSearch(params)}`,
  );
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return res.json() as Promise<OrganizationListResponse>;
}

const ALL_FETCH_PAGE_SIZE = 100;

/**
 * Fetches every page until `has_more` is false. Used by workspace shell so the
 * sidebar lists all orgs even when you have more than one page.
 */
export async function fetchAllOrganizations(): Promise<OrganizationListResponse> {
  const merged: OrganizationDto[] = [];
  let page = 1;
  let totalCount = 0;
  for (;;) {
    const res = await listOrganizations({
      page,
      page_size: ALL_FETCH_PAGE_SIZE,
    });
    merged.push(...res.data);
    totalCount = res.total_count;
    if (!res.has_more) break;
    page += 1;
    if (page > 10_000) {
      throw new Error("Organization list pagination exceeded safety limit.");
    }
  }
  return {
    object: "list",
    data: merged,
    has_more: false,
    total_count: totalCount,
    page: 1,
    page_size: merged.length,
  };
}

/**
 * Fetch one org only if the user is a member; otherwise 404.
 * Prefer this when you need membership re-check beyond the list cache.
 */
export async function getOrganization(
  organizationId: string,
): Promise<OrganizationDto> {
  const res = await apiFetch(`/api/v1/organizations/${organizationId}`);
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return res.json() as Promise<OrganizationDto>;
}

export async function createOrganization(
  name: string,
): Promise<OrganizationDto> {
  const res = await apiFetch("/api/v1/organizations", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return res.json() as Promise<OrganizationDto>;
}
