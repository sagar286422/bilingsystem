import type { FastifyReply, FastifyRequest } from "fastify";
import * as apiKeyService from "../services/api-key.service.js";
import { requireOrganizationMember } from "./require-org-member.js";
import { requireOrganizationWriteAccessDual } from "./require-org-write.js";
import { requireSession } from "./require-session.js";

/**
 * For org-scoped developer APIs: either
 * - `Authorization: Bearer sk_...` (must match URL `:organizationId`), or
 * - Better Auth session + org membership (dashboard).
 *
 * Rejects `pk_...` in Authorization (publishable keys are not for server routes).
 */
export async function requireOrganizationAccessDual(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const organizationId = (request.params as { organizationId?: string })
    .organizationId;
  if (!organizationId) {
    return reply.status(400).send({
      error: "Bad Request",
      code: "MISSING_ORGANIZATION_ID",
      message: "organizationId is required in the URL path.",
    });
  }

  const header = request.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    if (token.startsWith("sk_")) {
      const row = await apiKeyService.verifySecretKeyBearer(token);
      if (!row) {
        return reply.status(401).send({
          error: "Unauthorized",
          code: "INVALID_API_KEY",
          message: "Invalid or revoked secret API key.",
        });
      }
      if (row.organizationId !== organizationId) {
        return reply.status(403).send({
          error: "Forbidden",
          code: "API_KEY_ORG_MISMATCH",
          message:
            "This secret key belongs to a different organization than the URL.",
        });
      }
      request.apiKeyAuth = {
        organizationId: row.organizationId,
        apiKeyId: row.id,
        kind: row.kind,
        environment: row.environment,
        name: row.name,
      };
      request.orgMember = {
        organizationId: row.organizationId,
        role: "api_key",
      };
      return;
    }
    if (token.startsWith("pk_")) {
      return reply.status(401).send({
        error: "Unauthorized",
        code: "PUBLISHABLE_KEY_NOT_ALLOWED",
        message:
          "Use your secret key (sk_...) for server-to-server API calls. Publishable (pk_...) keys are for future browser/client flows.",
      });
    }
  }

  await requireSession(request, reply);
  if (reply.sent) return;
  await requireOrganizationMember(request, reply);
}

export const orgAccessDualPreHandlers = [requireOrganizationAccessDual];

/** Dual auth + write: `sk_` allowed; session users must be owner or admin. */
export const orgAccessDualWritePreHandlers = [
  requireOrganizationAccessDual,
  requireOrganizationWriteAccessDual,
];
