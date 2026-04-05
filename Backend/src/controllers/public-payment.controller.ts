import type { FastifyReply, FastifyRequest } from "fastify";
import * as paymentPageService from "../services/payment-page.service.js";

export async function getPublicPaymentPage(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { slug } = request.params as { slug: string };
  const page = await paymentPageService.getActivePaymentPageBySlug(slug);
  if (!page) {
    return reply.status(404).send({
      error: "Not Found",
      code: "PAYMENT_PAGE_NOT_FOUND",
      message: "This payment link is not available.",
    });
  }

  const price = page.price;
  const product = price.product;
  const org = page.organization;

  const customization =
    page.customization &&
    typeof page.customization === "object" &&
    !Array.isArray(page.customization)
      ? (page.customization as Record<string, unknown>)
      : {};

  return reply.send({
    object: "public_payment_page" as const,
    slug: page.slug,
    title: page.title ?? product.name,
    product_name: product.name,
    product_description: product.description,
    amount_minor: price.unitAmount,
    currency: price.currency,
    price_type: price.type,
    interval: price.interval,
    interval_count: price.intervalCount,
    payment_mode: org.paymentMode,
    platform_fee_bps: org.platformFeeBps,
    organization_name: org.name,
    customization,
  });
}

export async function createPublicPaymentOrder(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { slug } = request.params as { slug: string };

  try {
    const body = paymentPageService.parseCreateOrderBody(request.body);
    const result = await paymentPageService.createRazorpayOrderForPaymentPage(
      slug,
      body,
    );

    if ("error" in result) {
      if (result.error === "PAYMENT_PAGE_NOT_FOUND") {
        return reply.status(404).send({
          error: "Not Found",
          code: "PAYMENT_PAGE_NOT_FOUND",
        });
      }
      if (result.error === "PRICE_INACTIVE") {
        return reply.status(400).send({
          error: "Bad Request",
          code: "PRICE_INACTIVE",
        });
      }
      if (result.error === "BYOK_NOT_CONFIGURED") {
        return reply.status(503).send({
          error: "Service Unavailable",
          code: "BYOK_NOT_CONFIGURED",
          message:
            "This workspace must add Razorpay keys under Gateways (BYOK mode).",
        });
      }
      if (result.error === "PLATFORM_RAZORPAY_NOT_CONFIGURED") {
        return reply.status(503).send({
          error: "Service Unavailable",
          code: "PLATFORM_RAZORPAY_NOT_CONFIGURED",
          message:
            "Platform Razorpay is not configured. Set PLATFORM_RAZORPAY_KEY_ID and PLATFORM_RAZORPAY_KEY_SECRET on the API server.",
        });
      }
      if (result.error === "RAZORPAY_ERROR") {
        return reply.status(502).send({
          error: "Bad Gateway",
          code: "RAZORPAY_ERROR",
          message:
            "message" in result
              ? result.message
              : "Razorpay rejected the request.",
        });
      }
    }

    const ok = result;
    return reply.status(201).send({
      object: "razorpay_order" as const,
      order_id: ok.order_id,
      amount: ok.amount,
      currency: ok.currency,
      key_id: ok.key_id,
      transaction_id: ok.transaction_id,
      platform_fee_minor: ok.platform_fee_minor,
      title: ok.title,
      product_name: ok.product_name,
      price_type: ok.price_type,
      interval: ok.interval,
      interval_count: ok.interval_count,
    });
  } catch (e) {
    if (e instanceof paymentPageService.PaymentPageValidationError) {
      return reply.status(400).send({
        error: "Bad Request",
        code: "VALIDATION_ERROR",
        message: e.message,
      });
    }
    throw e;
  }
}

export async function verifyPublicPayment(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { slug } = request.params as { slug: string };

  try {
    const body = paymentPageService.parseVerifyPaymentBody(request.body);
    const result = await paymentPageService.verifyRazorpayPaymentForPage(
      slug,
      body,
    );

    if ("error" in result) {
      if (result.error === "PAYMENT_PAGE_NOT_FOUND") {
        return reply.status(404).send({
          error: "Not Found",
          code: "PAYMENT_PAGE_NOT_FOUND",
        });
      }
      if (result.error === "INVALID_SIGNATURE") {
        return reply.status(400).send({
          error: "Bad Request",
          code: "INVALID_SIGNATURE",
        });
      }
      if (result.error === "BYOK_NOT_CONFIGURED" || result.error === "PLATFORM_RAZORPAY_NOT_CONFIGURED") {
        return reply.status(503).send({
          error: "Service Unavailable",
          code: result.error,
        });
      }
      if (result.error === "TRANSACTION_NOT_FOUND") {
        return reply.status(404).send({
          error: "Not Found",
          code: "TRANSACTION_NOT_FOUND",
        });
      }
      if (result.error === "PAYMENT_NOT_COMPLETE") {
        return reply.status(400).send({
          error: "Bad Request",
          code: "PAYMENT_NOT_COMPLETE",
          message: "status" in result ? result.status : undefined,
        });
      }
      if (result.error === "ORDER_MISMATCH" || result.error === "AMOUNT_MISMATCH") {
        return reply.status(400).send({
          error: "Bad Request",
          code: result.error,
        });
      }
      return reply.status(400).send({
        error: "Bad Request",
        code: "VERIFY_FAILED",
        message: String(result.error),
      });
    }

    const ok = result;
    return reply.send({
      object: "payment_verified" as const,
      transaction_id: ok.transaction_id,
      already_verified: ok.already_verified,
    });
  } catch (e) {
    if (e instanceof paymentPageService.PaymentPageValidationError) {
      return reply.status(400).send({
        error: "Bad Request",
        code: "VALIDATION_ERROR",
        message: e.message,
      });
    }
    throw e;
  }
}
