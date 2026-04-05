import type { FastifyPluginAsync } from "fastify";
import * as planController from "../controllers/plan.controller.js";
import {
  orgAccessDualPreHandlers,
  orgAccessDualWritePreHandlers,
} from "../lib/require-org-access-dual.js";

const readPre = [...orgAccessDualPreHandlers];
const writePre = [...orgAccessDualWritePreHandlers];

export const planRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/api/v1/organizations/:organizationId/plans",
    { preHandler: writePre },
    planController.createPlan,
  );
  fastify.get(
    "/api/v1/organizations/:organizationId/plans",
    { preHandler: readPre },
    planController.listPlans,
  );
  fastify.get(
    "/api/v1/organizations/:organizationId/plans/:planId",
    { preHandler: readPre },
    planController.getPlan,
  );
  fastify.patch(
    "/api/v1/organizations/:organizationId/plans/:planId",
    { preHandler: writePre },
    planController.patchPlan,
  );
  fastify.delete(
    "/api/v1/organizations/:organizationId/plans/:planId",
    { preHandler: writePre },
    planController.deletePlan,
  );
};
