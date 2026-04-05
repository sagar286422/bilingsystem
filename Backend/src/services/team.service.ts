import { prisma } from "../db/prisma.js";
import { makePrefixedId } from "../lib/prefixed-id.js";
import * as credentialUserService from "./credential-user.service.js";
import { getOrganizationForUser } from "./organization.service.js";

export class TeamValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeamValidationError";
  }
}

const TEAM_TYPES = new Set(["geo", "product", "custom"]);
const TEAM_MEMBER_ROLES = new Set(["viewer", "member", "admin"]);

function parseOptionalTeamRole(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new TeamValidationError("role must be a string");
  }
  const r = value.trim().toLowerCase();
  if (!TEAM_MEMBER_ROLES.has(r)) {
    throw new TeamValidationError(
      `role must be one of: ${[...TEAM_MEMBER_ROLES].join(", ")}`,
    );
  }
  return r;
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new TeamValidationError(`${field} must be a string`);
  }
  const t = value.trim();
  if (!t) {
    throw new TeamValidationError(`${field} is required`);
  }
  return t;
}

function optionalCompanyId(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new TeamValidationError("company_id must be a string when provided");
  }
  const t = value.trim();
  return t.length ? t : undefined;
}

export function parseTeamCreateBody(body: unknown): {
  name: string;
  type: string;
  companyId?: string;
} {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new TeamValidationError("body must be a JSON object");
  }
  const b = body as Record<string, unknown>;
  const name = requireNonEmptyString(b.name, "name");
  const type = requireNonEmptyString(b.type, "type").toLowerCase();
  if (!TEAM_TYPES.has(type)) {
    throw new TeamValidationError(`type must be one of: geo, product, custom`);
  }
  const companyId = optionalCompanyId(b.company_id ?? b.companyId);
  return { name, type, companyId };
}

export function parseTeamPatchBody(body: unknown): Partial<{
  name: string;
  type: string;
  companyId: string | null;
}> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new TeamValidationError("body must be a JSON object");
  }
  const b = body as Record<string, unknown>;
  const out: Partial<{
    name: string;
    type: string;
    companyId: string | null;
  }> = {};

  if (b.name !== undefined) {
    out.name = requireNonEmptyString(b.name, "name");
  }
  if (b.type !== undefined) {
    const type = requireNonEmptyString(b.type, "type").toLowerCase();
    if (!TEAM_TYPES.has(type)) {
      throw new TeamValidationError(`type must be one of: geo, product, custom`);
    }
    out.type = type;
  }
  if (b.company_id !== undefined || b.companyId !== undefined) {
    const v = b.company_id ?? b.companyId;
    if (v === null) {
      out.companyId = null;
    } else if (typeof v === "string") {
      const t = v.trim();
      out.companyId = t.length ? t : null;
    } else {
      throw new TeamValidationError("company_id must be a string or null");
    }
  }

  if (Object.keys(out).length === 0) {
    throw new TeamValidationError("no valid fields to update");
  }
  return out;
}

async function assertCompanyInOrganization(
  organizationId: string,
  companyId: string,
) {
  const c = await prisma.company.findFirst({
    where: { id: companyId, organizationId },
  });
  if (!c) {
    throw new TeamValidationError(
      "company_id does not exist in this organization",
    );
  }
}

export async function createTeam(
  organizationId: string,
  data: ReturnType<typeof parseTeamCreateBody>,
) {
  if (data.companyId) {
    await assertCompanyInOrganization(organizationId, data.companyId);
  }
  return prisma.team.create({
    data: {
      id: makePrefixedId("team"),
      organizationId,
      name: data.name,
      type: data.type,
      companyId: data.companyId ?? null,
    },
  });
}

export async function listTeams(organizationId: string) {
  return prisma.team.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getTeamInOrganization(
  organizationId: string,
  teamId: string,
) {
  return prisma.team.findFirst({
    where: { id: teamId, organizationId },
  });
}

export async function updateTeamInOrganization(
  organizationId: string,
  teamId: string,
  patch: ReturnType<typeof parseTeamPatchBody>,
) {
  const existing = await getTeamInOrganization(organizationId, teamId);
  if (!existing) return null;

  if (patch.companyId !== undefined && patch.companyId !== null) {
    await assertCompanyInOrganization(organizationId, patch.companyId);
  }

  return prisma.team.update({
    where: { id: teamId },
    data: {
      ...("name" in patch && patch.name !== undefined ? { name: patch.name } : {}),
      ...("type" in patch && patch.type !== undefined ? { type: patch.type } : {}),
      ...("companyId" in patch && patch.companyId !== undefined
        ? { companyId: patch.companyId }
        : {}),
    },
  });
}

export async function deleteTeamInOrganization(
  organizationId: string,
  teamId: string,
) {
  const existing = await getTeamInOrganization(organizationId, teamId);
  if (!existing) return false;
  await prisma.team.delete({ where: { id: teamId } });
  return true;
}

export type AddTeamMemberBody =
  | { kind: "user_id"; userId: string; role?: string }
  | {
      kind: "credentials";
      email: string;
      password: string;
      name?: string;
      role?: string;
    };

export function parseAddTeamMemberBody(body: unknown): AddTeamMemberBody {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new TeamValidationError("body must be a JSON object");
  }
  const b = body as Record<string, unknown>;
  const emailRaw = b.email;
  const passwordRaw = b.password;
  const nameRaw = b.name;
  const userIdRaw = b.user_id ?? b.userId;

  const hasCredentials =
    typeof emailRaw === "string" &&
    emailRaw.trim() &&
    typeof passwordRaw === "string" &&
    passwordRaw.length > 0;
  const userId =
    typeof userIdRaw === "string" && userIdRaw.trim()
      ? userIdRaw.trim()
      : "";

  if (hasCredentials && userId) {
    throw new TeamValidationError(
      "send either user_id or email+password, not both",
    );
  }
  if (hasCredentials) {
    const email = emailRaw.trim().toLowerCase();
    const password = passwordRaw as string;
    const name =
      typeof nameRaw === "string" && nameRaw.trim() ? nameRaw.trim() : undefined;
    const role = parseOptionalTeamRole(b.role);
    return {
      kind: "credentials",
      email,
      password,
      ...(name ? { name } : {}),
      ...(role !== undefined ? { role } : {}),
    };
  }
  if (userId) {
    const role = parseOptionalTeamRole(b.role);
    return {
      kind: "user_id",
      userId,
      ...(role !== undefined ? { role } : {}),
    };
  }
  throw new TeamValidationError(
    "user_id or (email and password) is required",
  );
}

export async function addTeamMember(
  organizationId: string,
  teamId: string,
  input: AddTeamMemberBody,
) {
  const team = await getTeamInOrganization(organizationId, teamId);
  if (!team) return { error: "TEAM_NOT_FOUND" as const };

  if (input.kind === "credentials") {
    let newUser: { id: string };
    try {
      newUser = await credentialUserService.createUserWithEmailPassword({
        name: input.name ?? "",
        email: input.email,
        password: input.password,
      });
    } catch (e) {
      if (e instanceof credentialUserService.CredentialUserError) {
        if (e.code === "USER_EMAIL_EXISTS") {
          return { error: "USER_EMAIL_EXISTS" as const };
        }
        return {
          error: "CREDENTIAL_VALIDATION" as const,
          message: e.message,
        };
      }
      throw e;
    }

    try {
      const row = await prisma.$transaction(async (tx) => {
        await tx.organizationMember.upsert({
          where: {
            organizationId_userId: {
              organizationId,
              userId: newUser.id,
            },
          },
          create: {
            id: makePrefixedId("orgm"),
            organizationId,
            userId: newUser.id,
            role: "member",
          },
          update: {},
        });
        return tx.teamMember.create({
          data: {
            id: makePrefixedId("tm"),
            teamId,
            userId: newUser.id,
            role: input.role ?? "viewer",
          },
        });
      });
      return { member: row };
    } catch {
      return { error: "ALREADY_MEMBER" as const };
    }
  }

  const targetUserId = input.userId;
  const targetMember = await getOrganizationForUser(targetUserId, organizationId);
  if (!targetMember) {
    return { error: "USER_NOT_IN_ORGANIZATION" as const };
  }

  try {
    const row = await prisma.teamMember.create({
      data: {
        id: makePrefixedId("tm"),
        teamId,
        userId: targetUserId,
        role: input.role ?? "viewer",
      },
    });
    return { member: row };
  } catch {
    return { error: "ALREADY_MEMBER" as const };
  }
}

export async function removeTeamMember(
  organizationId: string,
  teamId: string,
  targetUserId: string,
) {
  const team = await getTeamInOrganization(organizationId, teamId);
  if (!team) return false;

  const result = await prisma.teamMember.deleteMany({
    where: { teamId, userId: targetUserId },
  });
  return result.count > 0;
}

export async function listTeamMembers(organizationId: string, teamId: string) {
  const team = await getTeamInOrganization(organizationId, teamId);
  if (!team) return null;

  return prisma.teamMember.findMany({
    where: { teamId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export function parsePatchTeamMemberBody(body: unknown): { role: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new TeamValidationError("body must be a JSON object");
  }
  const b = body as Record<string, unknown>;
  const role = parseOptionalTeamRole(b.role);
  if (!role) {
    throw new TeamValidationError("role is required");
  }
  return { role };
}

export async function patchTeamMemberRole(
  organizationId: string,
  teamId: string,
  targetUserId: string,
  role: string,
) {
  const team = await getTeamInOrganization(organizationId, teamId);
  if (!team) return { error: "TEAM_NOT_FOUND" as const };

  const existing = await prisma.teamMember.findFirst({
    where: { teamId, userId: targetUserId },
  });
  if (!existing) return { error: "MEMBER_NOT_FOUND" as const };

  const updated = await prisma.teamMember.update({
    where: { id: existing.id },
    data: { role },
  });
  return { member: updated };
}
