import type { FastifyReply, FastifyRequest } from "fastify";
import { getOrganizationForUser } from "../services/organization.service.js";
import { requireOrganizationOwner } from "./require-org-owner.js";
import { requireOrganizationWriteAccess } from "./require-org-write.js";
import { requireSession } from "./require-session.js";

export async function requireOrganizationMember(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = request.authUserId;
  if (!userId) {
    return reply.status(401).send({
      error: "Unauthorized",
      code: "UNAUTHORIZED",
    });
  }

  const organizationId = (request.params as { organizationId?: string })
    .organizationId;
  if (!organizationId) {
    return reply.status(400).send({
      error: "Bad Request",
      code: "MISSING_ORGANIZATION_ID",
      message: "organizationId is required in the URL path.",
    });
  }

  const member = await getOrganizationForUser(userId, organizationId);
  if (!member) {
    return reply.status(404).send({
      error: "Not Found",
      code: "ORGANIZATION_NOT_FOUND",
      message: "Organization not found or you are not a member.",
    });
  }

  request.orgMember = {
    organizationId,
    role: member.role,
  };
}

/** Session + membership in `:organizationId` from route params */
export const orgScopedPreHandlers = [requireSession, requireOrganizationMember];

/** Session + org member + owner (`ownerId`) or `admin` role */
export const orgWriteScopedPreHandlers = [
  requireSession,
  requireOrganizationMember,
  requireOrganizationWriteAccess,
];

/** Session + org member + must be org owner (`Organization.ownerId`) */
export const orgOwnerScopedPreHandlers = [
  requireSession,
  requireOrganizationMember,
  requireOrganizationOwner,
];
