import type { FastifyPluginAsync } from "fastify";
import * as subscriptionController from "../controllers/subscription.controller.js";
import {
  orgAccessDualPreHandlers,
  orgAccessDualWritePreHandlers,
} from "../lib/require-org-access-dual.js";

const readPre = [...orgAccessDualPreHandlers];
const writePre = [...orgAccessDualWritePreHandlers];

export const subscriptionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/api/v1/organizations/:organizationId/companies/:companyId/customers/:customerId/subscriptions",
    { preHandler: writePre },
    subscriptionController.createSubscription,
  );

  fastify.get(
    "/api/v1/organizations/:organizationId/companies/:companyId/customers/:customerId/subscriptions",
    { preHandler: readPre },
    subscriptionController.listSubscriptions,
  );

  fastify.get(
    "/api/v1/organizations/:organizationId/companies/:companyId/customers/:customerId/subscriptions/:subscriptionId",
    { preHandler: readPre },
    subscriptionController.getSubscription,
  );
};

