import type { OrganizationDto } from "@/lib/api/organizations";

/**
 * Whether the session user can mutate org structure: teams, org invites, etc.
 * Matches backend `sessionUserCanWriteOrg`: owners always; membership `admin` or `owner`.
 */
export function canManageOrgMembersAndTeams(
  org: Pick<OrganizationDto, "owner_id" | "membership_role"> | null | undefined,
  userId: string | undefined,
): boolean {
  if (!org || !userId) return false;
  if (org.owner_id === userId) return true;
  const r = org.membership_role;
  return r === "admin" || r === "owner";
}
