import type { FastifyReply, FastifyRequest } from "fastify";
import * as apiKeyService from "../services/api-key.service.js";

/**
 * Requires `Authorization: Bearer pk_test_...` or `pk_live_...`.
 * For `GET /api/v1/whoami-publishable` only — not for org CRUD routes.
 */
export async function requireValidPublishableApiKey(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.status(401).send({
      error: "Unauthorized",
      code: "PUBLISHABLE_KEY_REQUIRED",
      message:
        'Send header: Authorization: Bearer pk_test_... (publishable key only).',
    });
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return reply.status(401).send({
      error: "Unauthorized",
      code: "PUBLISHABLE_KEY_REQUIRED",
      message: "Empty Bearer token.",
    });
  }

  if (token.startsWith("sk_")) {
    return reply.status(403).send({
      error: "Forbidden",
      code: "SECRET_KEY_NOT_ALLOWED",
      message:
        "Use a publishable key (pk_...) here. Secret keys belong on your server only.",
    });
  }

  const row = await apiKeyService.verifyPublishableKeyBearer(token);
  if (!row) {
    return reply.status(401).send({
      error: "Unauthorized",
      code: "INVALID_PUBLISHABLE_KEY",
      message: "Invalid or revoked publishable API key.",
    });
  }

  request.publishableKeyAuth = {
    organizationId: row.organizationId,
    apiKeyId: row.id,
    environment: row.environment,
    name: row.name,
  };
}
