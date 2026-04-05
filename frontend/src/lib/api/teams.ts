import { apiFetch, readApiError } from "@/lib/api/http";

export function teamsQueryKey(organizationId: string | undefined) {
  return ["teams", organizationId ?? "_"] as const;
}

export function teamMembersQueryKey(
  organizationId: string | undefined,
  teamId: string | undefined,
) {
  return ["teamMembers", organizationId ?? "_", teamId ?? "_"] as const;
}

export type TeamDto = {
  object: "team";
  id: string;
  organization_id: string;
  company_id: string | null;
  name: string;
  type: string;
  created_at: string;
  updated_at: string;
};

export type TeamMemberDto = {
  object: "team_member";
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  created_at: string;
  user: { id: string; name: string; email: string };
};

export type TeamListResponse = {
  object: "list";
  data: TeamDto[];
  has_more: boolean;
};

export type TeamMemberListResponse = {
  object: "list";
  data: TeamMemberDto[];
  has_more: boolean;
};

function orgBase(organizationId: string) {
  return `/api/v1/organizations/${encodeURIComponent(organizationId)}`;
}

export async function listTeams(
  organizationId: string,
): Promise<TeamListResponse> {
  const res = await apiFetch(`${orgBase(organizationId)}/teams`);
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<TeamListResponse>;
}

export async function createTeam(
  organizationId: string,
  body: { name: string; type: string; company_id?: string | null },
): Promise<TeamDto> {
  const res = await apiFetch(`${orgBase(organizationId)}/teams`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<TeamDto>;
}

export async function listTeamMembers(
  organizationId: string,
  teamId: string,
): Promise<TeamMemberListResponse> {
  const res = await apiFetch(
    `${orgBase(organizationId)}/teams/${encodeURIComponent(teamId)}/members`,
  );
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<TeamMemberListResponse>;
}

export type TeamMemberCreateResponse = {
  object: "team_member";
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

export async function addTeamMemberByCredentials(
  organizationId: string,
  teamId: string,
  body: { email: string; password: string; name?: string; role?: string },
): Promise<TeamMemberCreateResponse> {
  const res = await apiFetch(
    `${orgBase(organizationId)}/teams/${encodeURIComponent(teamId)}/members`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<TeamMemberCreateResponse>;
}

export async function patchTeamMemberRole(
  organizationId: string,
  teamId: string,
  userId: string,
  body: { role: string },
): Promise<TeamMemberCreateResponse> {
  const res = await apiFetch(
    `${orgBase(organizationId)}/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<TeamMemberCreateResponse>;
}
