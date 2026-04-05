import type { FastifyPluginAsync } from "fastify";
import * as apiKeyController from "../controllers/api-key.controller.js";
import {
  orgWriteScopedPreHandlers,
} from "../lib/require-org-member.js";
import { requireValidSecretApiKey } from "../lib/require-api-key-secret.js";
import { requireValidPublishableApiKey } from "../lib/require-api-key-publishable.js";

const writePre = [...orgWriteScopedPreHandlers];

export const apiKeyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/api/v1/whoami",
    { preHandler: requireValidSecretApiKey },
    apiKeyController.whoamiFromApiKey,
  );

  fastify.get(
    "/api/v1/whoami-publishable",
    { preHandler: requireValidPublishableApiKey },
    apiKeyController.whoamiFromPublishableKey,
  );

  fastify.post(
    "/api/v1/organizations/:organizationId/api-keys",
    { preHandler: writePre },
    apiKeyController.createApiKey,
  );
  fastify.get(
    "/api/v1/organizations/:organizationId/api-keys",
    { preHandler: writePre },
    apiKeyController.listApiKeys,
  );
  fastify.delete(
    "/api/v1/organizations/:organizationId/api-keys/:apiKeyId",
    { preHandler: writePre },
    apiKeyController.revokeApiKey,
  );
};
