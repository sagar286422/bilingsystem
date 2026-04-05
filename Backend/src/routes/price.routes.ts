import type { FastifyPluginAsync } from "fastify";
import * as priceController from "../controllers/price.controller.js";
import {
  orgAccessDualPreHandlers,
  orgAccessDualWritePreHandlers,
} from "../lib/require-org-access-dual.js";

const readPre = [...orgAccessDualPreHandlers];
const writePre = [...orgAccessDualWritePreHandlers];

export const priceRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/api/v1/organizations/:organizationId/products/:productId/prices",
    { preHandler: writePre },
    priceController.createPrice,
  );
  fastify.get(
    "/api/v1/organizations/:organizationId/products/:productId/prices",
    { preHandler: readPre },
    priceController.listPrices,
  );
  fastify.get(
    "/api/v1/organizations/:organizationId/products/:productId/prices/:priceId",
    { preHandler: readPre },
    priceController.getPrice,
  );
  fastify.patch(
    "/api/v1/organizations/:organizationId/products/:productId/prices/:priceId",
    { preHandler: writePre },
    priceController.patchPrice,
  );
};
