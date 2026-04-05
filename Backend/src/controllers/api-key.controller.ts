import type { FastifyReply, FastifyRequest } from "fastify";
import type { ApiKey } from "@prisma/client";
import * as apiKeyService from "../services/api-key.service.js";

function keyDto(row: ApiKey, includeSecret?: string) {
  const base = {
    object: "api_key" as const,
    id: row.id,
    organization_id: row.organizationId,
    name: row.name,
    kind: row.kind,
    environment: row.environment,
    prefix: row.prefix,
    created_at: row.createdAt.toISOString(),
    revoked_at: row.revokedAt?.toISOString() ?? null,
  };
  if (includeSecret !== undefined) {
    return { ...base, secret: includeSecret };
  }
  return base;
}

export async function createApiKey(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  try {
    const input = apiKeyService.parseCreateApiKeyBody(request.body);
    const { row, secret } = await apiKeyService.createApiKey(orgId, input);
    const hint =
      input.kind === "secret"
        ? "Store the token now. It cannot be shown again. Use Authorization: Bearer <sk_...> for server API calls (GET /api/v1/whoami, /organizations/{id}/...)."
        : "Store the token now. It cannot be shown again. Safe for browsers: Authorization: Bearer <pk_...> on public checkout routes and GET /api/v1/whoami-publishable. Never use sk_ in client code.";
    return reply.status(201).send({
      ...keyDto(row, secret),
      message: hint,
    });
  } catch (e) {
    if (e instanceof apiKeyService.ApiKeyValidationError) {
      return reply.status(400).send({
        error: "Bad Request",
        code: "VALIDATION_ERROR",
        message: e.message,
      });
    }
    throw e;
  }
}

export async function listApiKeys(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const rows = await apiKeyService.listApiKeysForOrganization(orgId);
  return reply.send({
    object: "list",
    data: rows.map((r) => keyDto(r)),
    has_more: false,
  });
}

export async function revokeApiKey(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { apiKeyId } = request.params as { apiKeyId: string };
  const ok = await apiKeyService.revokeApiKey(orgId, apiKeyId);
  if (!ok) {
    return reply.status(404).send({
      error: "Not Found",
      code: "API_KEY_NOT_FOUND",
      message: "API key not found, already revoked, or wrong organization.",
    });
  }
  return reply.status(204).send();
}

export async function whoamiFromApiKey(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const ctx = request.apiKeyAuth;
  if (!ctx) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  return reply.send({
    object: "api_key_context",
    organization_id: ctx.organizationId,
    api_key_id: ctx.apiKeyId,
    name: ctx.name,
    kind: ctx.kind,
    environment: ctx.environment,
  });
}

export async function whoamiFromPublishableKey(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const ctx = request.publishableKeyAuth;
  if (!ctx) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  return reply.send({
    object: "publishable_key_context",
    organization_id: ctx.organizationId,
    api_key_id: ctx.apiKeyId,
    name: ctx.name,
    environment: ctx.environment,
  });
}
