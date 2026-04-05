import type { FastifyReply, FastifyRequest } from "fastify";
import * as orgMemberService from "../services/organization-member.service.js";

export async function listOrganizationMembers(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const rows = await orgMemberService.listOrganizationMembers(orgId);
  return reply.send({
    object: "list",
    data: rows.map((r) => ({
      object: "organization_member" as const,
      id: r.id,
      organization_id: r.organizationId,
      user_id: r.userId,
      role: r.role,
      created_at: r.createdAt.toISOString(),
      user: {
        id: r.user.id,
        name: r.user.name,
        email: r.user.email,
      },
    })),
    has_more: false,
  });
}

export async function addOrganizationMember(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  try {
    const input = orgMemberService.parseAddMemberBody(request.body);
    const targetUserId = await orgMemberService.resolveTargetUserId(input);
    if (!targetUserId) {
      return reply.status(404).send({
        error: "Not Found",
        code: "USER_NOT_FOUND",
        message:
          "No Better Auth user matches this user_id or email. They must sign up first.",
      });
    }

    const result = await orgMemberService.addOrganizationMember(
      orgId,
      targetUserId,
    );

    if (!result.ok) {
      return reply.status(409).send({
        error: "Conflict",
        code: "ALREADY_ORG_MEMBER",
        message: "User is already a member of this organization.",
      });
    }

    const { member: row } = result;
    return reply.status(201).send({
      object: "organization_member" as const,
      id: row.id,
      organization_id: row.organizationId,
      user_id: row.userId,
      role: row.role,
      created_at: row.createdAt.toISOString(),
      user: row.user,
    });
  } catch (e) {
    if (e instanceof orgMemberService.OrganizationMemberValidationError) {
      return reply.status(400).send({
        error: "Bad Request",
        code: "VALIDATION_ERROR",
        message: e.message,
      });
    }
    throw e;
  }
}

export async function patchOrganizationMember(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const orgId = request.orgMember?.organizationId;
  const actorUserId = request.authUserId;
  if (!orgId || !actorUserId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { memberId } = request.params as { memberId: string };

  try {
    const newRole = orgMemberService.parsePatchMemberRoleBody(request.body);
    const result = await orgMemberService.patchOrganizationMemberRole(
      orgId,
      memberId,
      actorUserId,
      newRole,
    );

    if (result.error === "ORG_NOT_FOUND") {
      return reply.status(404).send({
        error: "Not Found",
        code: "ORGANIZATION_NOT_FOUND",
        message: "Organization not found.",
      });
    }
    if (result.error === "NOT_OWNER") {
      return reply.status(403).send({
        error: "Forbidden",
        code: "ORG_OWNER_REQUIRED",
        message: "Only the organization owner may change member roles.",
      });
    }
    if (result.error === "NOT_FOUND") {
      return reply.status(404).send({
        error: "Not Found",
        code: "MEMBER_NOT_FOUND",
        message: "Member not found in this organization.",
      });
    }
    if (result.error === "CANNOT_CHANGE_OWNER_MEMBERSHIP") {
      return reply.status(403).send({
        error: "Forbidden",
        code: "CANNOT_CHANGE_OWNER_MEMBERSHIP",
        message: "The organization owner's membership role cannot be changed via API.",
      });
    }

    const row = result.member;
    return reply.send({
      object: "organization_member" as const,
      id: row.id,
      organization_id: row.organizationId,
      user_id: row.userId,
      role: row.role,
      created_at: row.createdAt.toISOString(),
      user: row.user,
    });
  } catch (e) {
    if (e instanceof orgMemberService.OrganizationMemberValidationError) {
      return reply.status(400).send({
        error: "Bad Request",
        code: "VALIDATION_ERROR",
        message: e.message,
      });
    }
    throw e;
  }
}

export async function deleteOrganizationMember(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const orgId = request.orgMember?.organizationId;
  const actorUserId = request.authUserId;
  if (!orgId || !actorUserId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { memberId } = request.params as { memberId: string };

  const result = await orgMemberService.removeOrganizationMemberById(
    orgId,
    memberId,
    actorUserId,
  );

  if (result.error === "ORG_NOT_FOUND") {
    return reply.status(404).send({
      error: "Not Found",
      code: "ORGANIZATION_NOT_FOUND",
      message: "Organization not found.",
    });
  }
  if (result.error === "NOT_OWNER") {
    return reply.status(403).send({
      error: "Forbidden",
      code: "ORG_OWNER_REQUIRED",
      message: "Only the organization owner may remove members.",
    });
  }
  if (result.error === "NOT_FOUND") {
    return reply.status(404).send({
      error: "Not Found",
      code: "MEMBER_NOT_FOUND",
      message: "Member not found in this organization.",
    });
  }
  if (result.error === "CANNOT_REMOVE_OWNER") {
    return reply.status(403).send({
      error: "Forbidden",
      code: "CANNOT_REMOVE_OWNER",
      message: "The organization owner cannot be removed from the organization.",
    });
  }

  return reply.status(204).send();
}
