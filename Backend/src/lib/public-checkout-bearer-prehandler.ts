import type { FastifyReply, FastifyRequest } from "fastify";
import * as apiKeyService from "../services/api-key.service.js";
import * as paymentPageService from "../services/payment-page.service.js";

function requirePublishableOnPublicCheckout(): boolean {
  return process.env.PUBLIC_CHECKOUT_REQUIRE_PUBLISHABLE_KEY === "true";
}

/**
 * Public payment routes:
 * - No `Authorization`: allowed unless `PUBLIC_CHECKOUT_REQUIRE_PUBLISHABLE_KEY=true`.
 * - `Bearer pk_...` must match the organization that owns the payment page `slug`.
 * - `Bearer sk_...` rejected (never use secret keys in the browser).
 * - Any other Bearer scheme: 401.
 */
export async function publicCheckoutBearerPreHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const slug = (request.params as { slug?: string }).slug;
  if (!slug) {
    return reply.status(400).send({
      error: "Bad Request",
      code: "MISSING_SLUG",
    });
  }

  const header = request.headers.authorization;
  const requirePk = requirePublishableOnPublicCheckout();

  if (!header?.startsWith("Bearer ")) {
    if (requirePk) {
      return reply.status(401).send({
        error: "Unauthorized",
        code: "PUBLISHABLE_KEY_REQUIRED",
        message:
          "This server requires Authorization: Bearer pk_test_... (or pk_live_...) on checkout API calls.",
      });
    }
    return;
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return reply.status(401).send({
      error: "Unauthorized",
      code: "INVALID_AUTHORIZATION",
      message: "Empty Bearer token.",
    });
  }

  if (token.startsWith("sk_")) {
    return reply.status(403).send({
      error: "Forbidden",
      code: "SECRET_KEY_NOT_ALLOWED_ON_PUBLIC_CHECKOUT",
      message:
        "Do not send secret keys (sk_...) from a browser. Use a publishable key (pk_...) or omit Authorization for anonymous checkout links.",
    });
  }

  if (!token.startsWith("pk_")) {
    return reply.status(401).send({
      error: "Unauthorized",
      code: "UNSUPPORTED_BEARER_TOKEN",
      message:
        "Use a publishable key (pk_test_... or pk_live_...), or omit Authorization.",
    });
  }

  const row = await apiKeyService.verifyPublishableKeyBearer(token);
  if (!row) {
    return reply.status(401).send({
      error: "Unauthorized",
      code: "INVALID_PUBLISHABLE_KEY",
      message: "Invalid or revoked publishable API key.",
    });
  }

  const page = await paymentPageService.getActivePaymentPageBySlug(slug);
  if (!page) {
    return reply.status(404).send({
      error: "Not Found",
      code: "PAYMENT_PAGE_NOT_FOUND",
      message: "This payment link is not available.",
    });
  }

  if (page.organizationId !== row.organizationId) {
    return reply.status(403).send({
      error: "Forbidden",
      code: "PUBLISHABLE_KEY_PAGE_ORG_MISMATCH",
      message:
        "This publishable key does not belong to the workspace that owns this payment page.",
    });
  }
}
