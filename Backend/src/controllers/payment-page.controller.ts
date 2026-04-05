import type { FastifyReply, FastifyRequest } from "fastify";
import * as paymentPageService from "../services/payment-page.service.js";

function pageDto(
  page: Awaited<
    ReturnType<typeof paymentPageService.listPaymentPagesForOrganization>
  >[number],
) {
  const price = page.price;
  const product = price.product;
  return {
    object: "payment_page" as const,
    id: page.id,
    organization_id: page.organizationId,
    company_id: page.companyId,
    price_id: page.priceId,
    slug: page.slug,
    title: page.title,
    active: page.active,
    company_name: page.company.name,
    product_name: product.name,
    amount_minor: price.unitAmount,
    currency: price.currency,
    price_type: price.type,
    interval: price.interval,
    interval_count: price.intervalCount,
    pay_path: `/pay/${page.slug}`,
    customization:
      page.customization &&
      typeof page.customization === "object" &&
      !Array.isArray(page.customization)
        ? (page.customization as Record<string, unknown>)
        : {},
    created_at: page.createdAt.toISOString(),
    updated_at: page.updatedAt.toISOString(),
  };
}

export async function createPaymentPage(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  try {
    const input = paymentPageService.parsePaymentPageCreateBody(request.body);
    const result = await paymentPageService.createPaymentPageInOrganization(
      orgId,
      input,
    );

    if ("error" in result) {
      if (result.error === "COMPANY_NOT_FOUND") {
        return reply.status(404).send({
          error: "Not Found",
          code: "COMPANY_NOT_FOUND",
          message: "Company not found in this organization.",
        });
      }
      if (result.error === "PRICE_NOT_FOUND") {
        return reply.status(404).send({
          error: "Not Found",
          code: "PRICE_NOT_FOUND",
          message: "Price not found or inactive for this organization.",
        });
      }
      if (result.error === "SLUG_TAKEN") {
        return reply.status(409).send({
          error: "Conflict",
          code: "PAYMENT_PAGE_SLUG_TAKEN",
          message: "This slug is already in use.",
        });
      }
    }

    const { page } = result as Exclude<typeof result, { error: string }>;
    return reply.status(201).send(pageDto(page));
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

export async function listPaymentPages(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const rows = await paymentPageService.listPaymentPagesForOrganization(orgId);
  return reply.send({
    object: "list",
    data: rows.map(pageDto),
    has_more: false,
  });
}

export async function patchPaymentPage(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { paymentPageId } = request.params as { paymentPageId: string };

  try {
    const patch = paymentPageService.parsePaymentPagePatchBody(request.body);
    const result = await paymentPageService.patchPaymentPageInOrganization(
      orgId,
      paymentPageId,
      patch,
    );

    if ("error" in result && result.error === "NOT_FOUND") {
      return reply.status(404).send({
        error: "Not Found",
        code: "PAYMENT_PAGE_NOT_FOUND",
        message: "Payment page not found in this organization.",
      });
    }

    const { page } = result as Exclude<typeof result, { error: string }>;
    return reply.send(pageDto(page));
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
