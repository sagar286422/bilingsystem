import type { FastifyReply, FastifyRequest } from "fastify";
import { sessionUserCanWriteOrg } from "./org-rbac.js";
import { getOrganizationById } from "../services/organization.service.js";

/**
 * After `requireSession` + `requireOrganizationMember`.
 * Allows organization `ownerId` or membership role `admin`. Role `member` is read-only for write routes.
 */
export async function requireOrganizationWriteAccess(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = request.authUserId;
  const orgId = request.orgMember?.organizationId;
  const role = request.orgMember?.role;
  if (!userId || !orgId) {
    return reply.status(403).send({
      error: "Forbidden",
      code: "FORBIDDEN",
      message: "Organization context missing.",
    });
  }

  const org = await getOrganizationById(orgId);
  if (!org) {
    return reply.status(404).send({
      error: "Not Found",
      code: "ORGANIZATION_NOT_FOUND",
      message: "Organization not found.",
    });
  }

  if (!sessionUserCanWriteOrg(org.ownerId, userId, role)) {
    return reply.status(403).send({
      error: "Forbidden",
      code: "ORG_WRITE_REQUIRED",
      message:
        "Organization owner or a member with admin role is required for this action.",
    });
  }
}

/**
 * After `requireOrganizationAccessDual`. Secret key (`sk_`) has full write; session users need owner or admin.
 */
export async function requireOrganizationWriteAccessDual(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (request.apiKeyAuth?.organizationId) {
    return;
  }

  await requireOrganizationWriteAccess(request, reply);
}
