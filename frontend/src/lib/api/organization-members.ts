import { apiFetch, readApiError } from "@/lib/api/http";

export function organizationMembersQueryKey(organizationId: string | undefined) {
  return ["organizationMembers", organizationId ?? "_"] as const;
}

export type OrganizationMemberDto = {
  object: "organization_member";
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  created_at: string;
  user: { id: string; name: string; email: string };
};

export type OrganizationMemberListResponse = {
  object: "list";
  data: OrganizationMemberDto[];
  has_more: boolean;
};

function orgBase(organizationId: string) {
  return `/api/v1/organizations/${encodeURIComponent(organizationId)}`;
}

export async function listOrganizationMembers(
  organizationId: string,
): Promise<OrganizationMemberListResponse> {
  const res = await apiFetch(`${orgBase(organizationId)}/members`);
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<OrganizationMemberListResponse>;
}

export async function inviteOrganizationMemberByEmail(
  organizationId: string,
  email: string,
): Promise<OrganizationMemberDto> {
  const res = await apiFetch(`${orgBase(organizationId)}/members`, {
    method: "POST",
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<OrganizationMemberDto>;
}
