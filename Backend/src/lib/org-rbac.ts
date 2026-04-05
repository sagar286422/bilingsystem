/** Stored on `organization_member.role`. */
export const ORG_ROLES = ["owner", "admin", "member"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export function normalizeOrgMemberRole(raw: string | undefined): OrgRole {
  if (raw === "owner" || raw === "admin" || raw === "member") return raw;
  return "member";
}

export function sessionUserCanWriteOrg(
  organizationOwnerId: string,
  userId: string,
  membershipRole: string | undefined,
): boolean {
  if (userId === organizationOwnerId) return true;
  return normalizeOrgMemberRole(membershipRole) === "admin";
}
