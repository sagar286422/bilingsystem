import type { FastifyPluginAsync } from "fastify";
import * as organizationController from "../controllers/organization.controller.js";
import { requireSession } from "../lib/require-session.js";

export const organizationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/api/v1/organizations",
    { preHandler: requireSession },
    organizationController.createOrganization,
  );
  fastify.get(
    "/api/v1/organizations",
    { preHandler: requireSession },
    organizationController.listOrganizations,
  );
  fastify.get(
    "/api/v1/organizations/:organizationId",
    { preHandler: requireSession },
    organizationController.getOrganization,
  );
};
