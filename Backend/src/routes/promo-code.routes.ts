import type { FastifyPluginAsync } from "fastify";
import * as promoController from "../controllers/promo-code.controller.js";
import {
  orgAccessDualPreHandlers,
  orgAccessDualWritePreHandlers,
} from "../lib/require-org-access-dual.js";

const readPre = [...orgAccessDualPreHandlers];
const writePre = [...orgAccessDualWritePreHandlers];

export const promoCodeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/api/v1/organizations/:organizationId/promo-codes",
    { preHandler: writePre },
    promoController.createPromoCode,
  );

  fastify.get(
    "/api/v1/organizations/:organizationId/promo-codes",
    { preHandler: readPre },
    promoController.listPromoCodes,
  );

  fastify.delete(
    "/api/v1/organizations/:organizationId/promo-codes/:promoCodeId",
    { preHandler: writePre },
    promoController.revokePromoCode,
  );
};

