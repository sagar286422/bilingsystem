import type { FastifyPluginAsync } from "fastify";
import * as productController from "../controllers/product.controller.js";
import {
  orgAccessDualPreHandlers,
  orgAccessDualWritePreHandlers,
} from "../lib/require-org-access-dual.js";

const readPre = [...orgAccessDualPreHandlers];
const writePre = [...orgAccessDualWritePreHandlers];

export const productRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/api/v1/organizations/:organizationId/products",
    { preHandler: writePre },
    productController.createProduct,
  );
  fastify.get(
    "/api/v1/organizations/:organizationId/products",
    { preHandler: readPre },
    productController.listProducts,
  );
  fastify.get(
    "/api/v1/organizations/:organizationId/products/:productId",
    { preHandler: readPre },
    productController.getProduct,
  );
  fastify.patch(
    "/api/v1/organizations/:organizationId/products/:productId",
    { preHandler: writePre },
    productController.patchProduct,
  );
  fastify.delete(
    "/api/v1/organizations/:organizationId/products/:productId",
    { preHandler: writePre },
    productController.deleteProduct,
  );
};
