import type { FastifyPluginAsync } from "fastify";
import * as publicPaymentController from "../controllers/public-payment.controller.js";
import { publicCheckoutBearerPreHandler } from "../lib/public-checkout-bearer-prehandler.js";

/**
 * Optional `Authorization: Bearer pk_...` ties the call to the org that owns the page.
 * Set `PUBLIC_CHECKOUT_REQUIRE_PUBLISHABLE_KEY=true` to require pk_ (hosted checkout must send it).
 */
export const publicPaymentRoutes: FastifyPluginAsync = async (fastify) => {
  const pre = [publicCheckoutBearerPreHandler];
  fastify.get(
    "/api/v1/public/payment-pages/:slug",
    { preHandler: pre },
    publicPaymentController.getPublicPaymentPage,
  );
  fastify.post(
    "/api/v1/public/payment-pages/:slug/orders",
    { preHandler: pre },
    publicPaymentController.createPublicPaymentOrder,
  );
  fastify.post(
    "/api/v1/public/payment-pages/:slug/verify-payment",
    { preHandler: pre },
    publicPaymentController.verifyPublicPayment,
  );
};
