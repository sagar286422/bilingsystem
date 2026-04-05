import { apiFetch, readApiError } from "@/lib/api/http";

export function companiesQueryKey(organizationId: string | undefined) {
  return ["companies", organizationId ?? "_"] as const;
}

export function companyMembersQueryKey(
  organizationId: string | undefined,
  companyId: string | undefined,
) {
  return ["companyMembers", organizationId ?? "_", companyId ?? "_"] as const;
}

export type CompanyDto = {
  object: "company";
  id: string;
  organization_id: string;
  name: string;
  logo: string | null;
  country: string;
  currency: string;
  tax_id: string | null;
  address: string | null;
  default_gateway: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyListResponse = {
  object: "list";
  data: CompanyDto[];
  has_more: boolean;
};

export type CreateCompanyBody = {
  name: string;
  country: string;
  currency: string;
  logo?: string;
  tax_id?: string;
  address?: string;
  default_gateway?: string;
};

function orgBase(organizationId: string) {
  return `/api/v1/organizations/${encodeURIComponent(organizationId)}`;
}

export async function listCompanies(
  organizationId: string,
): Promise<CompanyListResponse> {
  const res = await apiFetch(`${orgBase(organizationId)}/companies`);
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<CompanyListResponse>;
}

export type CompanyMemberDto = {
  object: "company_member";
  id: string;
  company_id: string;
  user_id: string;
  role: string;
  created_at: string;
  user: { id: string; name: string; email: string };
};

export type CompanyMemberListResponse = {
  object: "list";
  data: CompanyMemberDto[];
  has_more: boolean;
};

export async function listCompanyMembers(
  organizationId: string,
  companyId: string,
): Promise<CompanyMemberListResponse> {
  const res = await apiFetch(
    `${orgBase(organizationId)}/companies/${encodeURIComponent(companyId)}/members`,
  );
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<CompanyMemberListResponse>;
}

export async function addCompanyMember(
  organizationId: string,
  companyId: string,
  userId: string,
): Promise<CompanyMemberDto> {
  const res = await apiFetch(
    `${orgBase(organizationId)}/companies/${encodeURIComponent(companyId)}/members`,
    {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    },
  );
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<CompanyMemberDto>;
}

export async function removeCompanyMember(
  organizationId: string,
  companyId: string,
  userId: string,
): Promise<void> {
  const res = await apiFetch(
    `${orgBase(organizationId)}/companies/${encodeURIComponent(companyId)}/members/${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error(await readApiError(res));
}

export async function createCompany(
  organizationId: string,
  body: CreateCompanyBody,
): Promise<CompanyDto> {
  const res = await apiFetch(`${orgBase(organizationId)}/companies`, {
    method: "POST",
    body: JSON.stringify({
      name: body.name,
      country: body.country,
      currency: body.currency,
      ...(body.logo ? { logo: body.logo } : {}),
      ...(body.tax_id ? { tax_id: body.tax_id } : {}),
      ...(body.address ? { address: body.address } : {}),
      ...(body.default_gateway
        ? { default_gateway: body.default_gateway }
        : {}),
    }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<CompanyDto>;
}
