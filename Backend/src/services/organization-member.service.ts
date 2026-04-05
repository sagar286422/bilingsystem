import { prisma } from "../db/prisma.js";
import { makePrefixedId } from "../lib/prefixed-id.js";

export class OrganizationMemberValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrganizationMemberValidationError";
  }
}

export function parseAddMemberBody(body: unknown): {
  userId?: string;
  email?: string;
} {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new OrganizationMemberValidationError("body must be a JSON object");
  }
  const b = body as Record<string, unknown>;
  const userIdRaw = b.user_id ?? b.userId;
  const emailRaw = b.email;

  const userId =
    typeof userIdRaw === "string" && userIdRaw.trim()
      ? userIdRaw.trim()
      : undefined;
  const email =
    typeof emailRaw === "string" && emailRaw.trim()
      ? emailRaw.trim().toLowerCase()
      : undefined;

  if (userId && email) {
    throw new OrganizationMemberValidationError(
      "send only one of user_id or email, not both",
    );
  }
  if (!userId && !email) {
    throw new OrganizationMemberValidationError(
      "user_id or email is required",
    );
  }
  return { userId, email };
}

export async function resolveTargetUserId(input: {
  userId?: string;
  email?: string;
}): Promise<string | null> {
  if (input.userId) {
    const u = await prisma.user.findUnique({ where: { id: input.userId } });
    return u?.id ?? null;
  }
  if (input.email) {
    const u = await prisma.user.findUnique({ where: { email: input.email } });
    return u?.id ?? null;
  }
  return null;
}

export async function addOrganizationMember(
  organizationId: string,
  targetUserId: string,
  role = "member",
) {
  try {
    const member = await prisma.organizationMember.create({
      data: {
        id: makePrefixedId("orgm"),
        organizationId,
        userId: targetUserId,
        role,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
    return { ok: true as const, member };
  } catch {
    return { ok: false as const, error: "ALREADY_MEMBER" as const };
  }
}

export async function listOrganizationMembers(organizationId: string) {
  return prisma.organizationMember.findMany({
    where: { organizationId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export function parsePatchMemberRoleBody(body: unknown): "admin" | "member" {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new OrganizationMemberValidationError("body must be a JSON object");
  }
  const b = body as Record<string, unknown>;
  const role = b.role;
  if (role !== "admin" && role !== "member") {
    throw new OrganizationMemberValidationError(
      'role must be "admin" or "member"',
    );
  }
  return role;
}

export async function patchOrganizationMemberRole(
  organizationId: string,
  memberRecordId: string,
  actorUserId: string,
  newRole: "admin" | "member",
) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  });
  if (!org) return { error: "ORG_NOT_FOUND" as const };
  if (org.ownerId !== actorUserId) return { error: "NOT_OWNER" as const };

  const row = await prisma.organizationMember.findFirst({
    where: { id: memberRecordId, organizationId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!row) return { error: "NOT_FOUND" as const };
  if (row.userId === org.ownerId) {
    return { error: "CANNOT_CHANGE_OWNER_MEMBERSHIP" as const };
  }

  const member = await prisma.organizationMember.update({
    where: { id: memberRecordId },
    data: { role: newRole },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
  return { ok: true as const, member };
}

export async function removeOrganizationMemberById(
  organizationId: string,
  memberRecordId: string,
  actorUserId: string,
) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  });
  if (!org) return { error: "ORG_NOT_FOUND" as const };
  if (org.ownerId !== actorUserId) return { error: "NOT_OWNER" as const };

  const row = await prisma.organizationMember.findFirst({
    where: { id: memberRecordId, organizationId },
  });
  if (!row) return { error: "NOT_FOUND" as const };
  if (row.userId === org.ownerId) {
    return { error: "CANNOT_REMOVE_OWNER" as const };
  }

  await prisma.organizationMember.delete({ where: { id: memberRecordId } });
  return { ok: true as const };
}
