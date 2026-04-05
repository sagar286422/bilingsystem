import type { Invoice, Plan, Price, Subscription, Transaction } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import * as subscriptionService from "../services/subscription.service.js";

function priceSummaryDto(p: Price & { product?: { name: string } | null }) {
  return {
    id: p.id,
    product_id: p.productId,
    product_name: p.product?.name ?? null,
    currency: p.currency,
    unit_amount: p.unitAmount,
    type: p.type,
    billing_scheme: p.billingScheme,
    interval: p.interval,
    interval_count: p.intervalCount,
    trial_days: p.trialDays,
    version: p.version,
    active: p.active,
  };
}

function planDto(p: Plan) {
  return {
    id: p.id,
    organization_id: p.organizationId,
    name: p.name,
    description: p.description,
    slug: p.slug,
    active: p.active,
    metadata: p.metadata,
    price_id: p.priceId,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

function invoiceDto(i: Invoice) {
  return {
    object: "invoice" as const,
    id: i.id,
    organization_id: i.organizationId,
    company_id: i.companyId,
    customer_id: i.customerId,
    subscription_id: i.subscriptionId,
    promo_code_id: i.promoCodeId,
    subtotal_amount: i.subtotalAmount,
    discount_amount: i.discountAmount,
    total_amount: i.totalAmount,
    currency: i.currency,
    status: i.status,
    pdf_url: i.pdfUrl,
    created_at: i.createdAt.toISOString(),
    updated_at: i.updatedAt.toISOString(),
  };
}

function transactionDto(t: Transaction) {
  return {
    object: "transaction" as const,
    id: t.id,
    organization_id: t.organizationId,
    company_id: t.companyId,
    customer_id: t.customerId,
    subscription_id: t.subscriptionId,
    invoice_id: t.invoiceId,
    amount: t.amount,
    currency: t.currency,
    status: t.status,
    gateway: t.gateway,
    gateway_reference_id: t.gatewayReferenceId,
    payment_page_id: t.paymentPageId ?? null,
    platform_fee_minor: t.platformFeeMinor ?? null,
    metadata: t.metadata,
    created_at: t.createdAt.toISOString(),
    updated_at: t.updatedAt.toISOString(),
  };
}

function subscriptionDto(s: Subscription, opts?: { price?: Price | null; plan?: Plan | null }) {
  return {
    object: "subscription" as const,
    id: s.id,
    organization_id: s.organizationId,
    company_id: s.companyId,
    customer_id: s.customerId,
    price_id: s.priceId,
    plan_id: s.planId,
    status: s.status,
    current_period_start: s.currentPeriodStart.toISOString(),
    current_period_end: s.currentPeriodEnd.toISOString(),
    cancel_at: s.cancelAt ? s.cancelAt.toISOString() : null,
    latest_invoice_id: s.latestInvoiceId,
    created_at: s.createdAt.toISOString(),
    updated_at: s.updatedAt.toISOString(),
    ...(opts?.price ? { price: priceSummaryDto(opts.price) } : {}),
    ...(opts?.plan ? { plan: planDto(opts.plan) } : {}),
  };
}

export async function createSubscription(request: FastifyRequest, reply: FastifyReply) {
  const organizationId = request.orgMember?.organizationId;
  if (!organizationId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { companyId, customerId } = request.params as {
    companyId: string;
    customerId: string;
  };

  try {
    const input = subscriptionService.parseSubscriptionCreateBody(request.body);
    const result = await subscriptionService.createSubscriptionForCustomer(
      organizationId,
      companyId,
      customerId,
      input,
    );

    if ("error" in result) {
      if (result.error === "CUSTOMER_NOT_FOUND") {
        return reply.status(404).send({
          error: "Not Found",
          code: "CUSTOMER_NOT_FOUND",
          message: "Customer not found in this company/org.",
        });
      }
      if (result.error === "PRICE_NOT_FOUND") {
        return reply.status(404).send({
          error: "Not Found",
          code: "PRICE_NOT_FOUND",
          message: "Price not found or not active in this organization.",
        });
      }
      if (result.error === "PRICE_TYPE_UNSUPPORTED") {
        return reply.status(400).send({
          error: "Bad Request",
          code: "PRICE_TYPE_UNSUPPORTED",
          message: "Only recurring prices can be used to create subscriptions for now.",
        });
      }
      if (result.error === "PRICE_INTERVAL_MISSING") {
        return reply.status(400).send({
          error: "Bad Request",
          code: "PRICE_INTERVAL_MISSING",
          message: "Recurring prices require interval (month/year).",
        });
      }
      if (result.error === "PLAN_NOT_FOUND") {
        return reply.status(404).send({
          error: "Not Found",
          code: "PLAN_NOT_FOUND",
          message: "Plan not found in this organization for the given price.",
        });
      }
      if (result.error === "PROMO_CODE_NOT_FOUND") {
        return reply.status(404).send({
          error: "Not Found",
          code: "PROMO_CODE_NOT_FOUND",
          message: "Promo code not found in this organization.",
        });
      }
      if (result.error === "PROMO_CODE_EXPIRED") {
        return reply.status(400).send({
          error: "Bad Request",
          code: "PROMO_CODE_EXPIRED",
          message: "Promo code has expired.",
        });
      }
      if (result.error === "PROMO_CODE_MAX_REACHED") {
        return reply.status(400).send({
          error: "Bad Request",
          code: "PROMO_CODE_MAX_REACHED",
          message: "Promo code usage limit has been reached.",
        });
      }
      if (result.error === "PROMO_CODE_NOT_APPLICABLE") {
        return reply.status(400).send({
          error: "Bad Request",
          code: "PROMO_CODE_NOT_APPLICABLE",
          message: "Promo code is not applicable for this price/product.",
        });
      }
      if (result.error === "PROMO_CODE_INVALID") {
        return reply.status(400).send({
          error: "Bad Request",
          code: "PROMO_CODE_INVALID",
          message: "Promo code configuration is invalid.",
        });
      }
      return reply.status(400).send({
        error: "Bad Request",
        code: "SUBSCRIPTION_CREATE_FAILED",
        message: result.error,
      });
    }

    return reply.status(201).send({
      subscription: subscriptionDto(result.subscription),
      latest_invoice: invoiceDto(result.invoice),
      latest_transaction: transactionDto(result.transaction),
    });
  } catch (e) {
    if (e instanceof subscriptionService.SubscriptionValidationError) {
      return reply.status(400).send({
        error: "Bad Request",
        code: "VALIDATION_ERROR",
        message: e.message,
      });
    }
    throw e;
  }
}

export async function listSubscriptions(request: FastifyRequest, reply: FastifyReply) {
  const organizationId = request.orgMember?.organizationId;
  if (!organizationId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }
  const { companyId, customerId } = request.params as {
    companyId: string;
    customerId: string;
  };

  const rows = await subscriptionService.listSubscriptionsForCustomer(
    organizationId,
    companyId,
    customerId,
  );

  return reply.send({
    object: "list",
    data: rows.map((s) =>
      subscriptionDto(s, {
        price: s.price,
        plan: s.plan ?? null,
      }),
    ),
    has_more: false,
  });
}

export async function getSubscription(request: FastifyRequest, reply: FastifyReply) {
  const organizationId = request.orgMember?.organizationId;
  if (!organizationId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { companyId, customerId, subscriptionId } = request.params as {
    companyId: string;
    customerId: string;
    subscriptionId: string;
  };

  const row = await subscriptionService.getSubscriptionInCustomer(
    organizationId,
    companyId,
    customerId,
    subscriptionId,
  );
  if (!row) {
    return reply.status(404).send({
      error: "Not Found",
      code: "SUBSCRIPTION_NOT_FOUND",
      message: "Subscription not found in this customer/company.",
    });
  }

  return reply.send({
    subscription: subscriptionDto(row, {
      price: row.price,
      plan: row.plan ?? null,
    }),
    recent_invoices: (row.invoices ?? []).map(invoiceDto),
  });
}

