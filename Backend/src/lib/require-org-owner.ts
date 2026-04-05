import type { FastifyReply, FastifyRequest } from "fastify";
import { getOrganizationById } from "../services/organization.service.js";

/**
 * After `requireSession` + `requireOrganizationMember`.
 * Only the organization `ownerId` may add/remove org members (until RBAC adds admin).
 */
export async function requireOrganizationOwner(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = request.authUserId;
  const orgId = request.orgMember?.organizationId;
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

  if (org.ownerId !== userId) {
    return reply.status(403).send({
      error: "Forbidden",
      code: "ORG_OWNER_REQUIRED",
      message:
        "Only the organization owner (owner_id) may perform this action.",
    });
  }
}
