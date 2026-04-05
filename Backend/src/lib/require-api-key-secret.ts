import type { FastifyReply, FastifyRequest } from "fastify";
import * as apiKeyService from "../services/api-key.service.js";

/**
 * Requires `Authorization: Bearer sk_test_...` or `sk_live_...`.
 * Publishable (`pk_`) keys do not authenticate server API calls here.
 */
export async function requireValidSecretApiKey(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.status(401).send({
      error: "Unauthorized",
      code: "API_KEY_REQUIRED",
      message:
        'Send header: Authorization: Bearer sk_test_... (secret key only).',
    });
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return reply.status(401).send({
      error: "Unauthorized",
      code: "API_KEY_REQUIRED",
      message: "Empty Bearer token.",
    });
  }

  const row = await apiKeyService.verifySecretKeyBearer(token);
  if (!row) {
    return reply.status(401).send({
      error: "Unauthorized",
      code: "INVALID_API_KEY",
      message: "Invalid, revoked, or non-secret API key.",
    });
  }

  request.apiKeyAuth = {
    organizationId: row.organizationId,
    apiKeyId: row.id,
    kind: row.kind,
    environment: row.environment,
    name: row.name,
  };
}
