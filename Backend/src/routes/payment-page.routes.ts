import type { FastifyPluginAsync } from "fastify";
import * as paymentPageController from "../controllers/payment-page.controller.js";
import {
  orgAccessDualPreHandlers,
  orgAccessDualWritePreHandlers,
} from "../lib/require-org-access-dual.js";

const readPre = [...orgAccessDualPreHandlers];
const writePre = [...orgAccessDualWritePreHandlers];

export const paymentPageRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/api/v1/organizations/:organizationId/payment-pages",
    { preHandler: writePre },
    paymentPageController.createPaymentPage,
  );
  fastify.get(
    "/api/v1/organizations/:organizationId/payment-pages",
    { preHandler: readPre },
    paymentPageController.listPaymentPages,
  );
  fastify.patch(
    "/api/v1/organizations/:organizationId/payment-pages/:paymentPageId",
    { preHandler: writePre },
    paymentPageController.patchPaymentPage,
  );
};
