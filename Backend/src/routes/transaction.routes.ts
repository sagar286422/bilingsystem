import type { FastifyPluginAsync } from "fastify";
import * as transactionController from "../controllers/transaction.controller.js";
import { orgAccessDualPreHandlers } from "../lib/require-org-access-dual.js";

const preHandler = [...orgAccessDualPreHandlers];

export const transactionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/api/v1/organizations/:organizationId/companies/:companyId/transactions",
    { preHandler },
    transactionController.listTransactions,
  );

  fastify.get(
    "/api/v1/organizations/:organizationId/companies/:companyId/transactions/:transactionId",
    { preHandler },
    transactionController.getTransaction,
  );
};

