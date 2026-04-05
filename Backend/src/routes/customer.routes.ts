import type { FastifyPluginAsync } from "fastify";
import * as customerController from "../controllers/customer.controller.js";
import {
  orgAccessDualPreHandlers,
  orgAccessDualWritePreHandlers,
} from "../lib/require-org-access-dual.js";

const readPre = [...orgAccessDualPreHandlers];
const writePre = [...orgAccessDualWritePreHandlers];

export const customerRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/api/v1/organizations/:organizationId/companies/:companyId/customers",
    { preHandler: writePre },
    customerController.createCustomer,
  );

  fastify.get(
    "/api/v1/organizations/:organizationId/companies/:companyId/customers",
    { preHandler: readPre },
    customerController.listCustomers,
  );

  fastify.get(
    "/api/v1/organizations/:organizationId/companies/:companyId/customers/:customerId",
    { preHandler: readPre },
    customerController.getCustomer,
  );
};

