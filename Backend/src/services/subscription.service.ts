import type {
  Prisma,
  Subscription,
  Invoice,
  Transaction,
} from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "../db/prisma.js";
import { makePrefixedId } from "../lib/prefixed-id.js";

export class SubscriptionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubscriptionValidationError";
  }
}

function parseMetadata(raw: unknown): Prisma.InputJsonValue {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new SubscriptionValidationError("metadata must be a JSON object");
  }
  return raw as Prisma.InputJsonValue;
}

function parseIntPositive(raw: unknown, field: string): number {
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 1) {
    throw new SubscriptionValidationError(`${field} must be an integer >= 1`);
  }
  return raw;
}

function addInterval(start: Date, interval: string, intervalCount: number) {
  const d = new Date(start.getTime());
  if (interval === "month") d.setMonth(d.getMonth() + intervalCount);
  else if (interval === "year") d.setFullYear(d.getFullYear() + intervalCount);
  else throw new SubscriptionValidationError(`unsupported interval: ${interval}`);
  return d;
}

export function parseSubscriptionCreateBody(body: unknown): {
  price_id: string;
  plan_id?: string | null;
  quantity: number;
  metadata?: Prisma.InputJsonValue;
  promo_code?: string | null;
} {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new SubscriptionValidationError("body must be a JSON object");
  }
  const b = body as Record<string, unknown>;

  if (typeof b.price_id !== "string" || !b.price_id.trim()) {
    throw new SubscriptionValidationError("price_id is required");
  }
  const price_id = b.price_id.trim();

  let plan_id: string | null | undefined;
  if (b.plan_id !== undefined) {
    if (b.plan_id === null) plan_id = null;
    else if (typeof b.plan_id === "string") plan_id = b.plan_id.trim();
    else throw new SubscriptionValidationError("plan_id must be a string or null");
  }

  let quantity = 1;
  if (b.quantity !== undefined) {
    quantity = parseIntPositive(b.quantity, "quantity");
  }

  const metadata =
    b.metadata !== undefined ? parseMetadata(b.metadata) : undefined;

  const promo_codeRaw = b.promo_code ?? b.promoCode;
  let promo_code: string | null | undefined = undefined;
  if (promo_codeRaw !== undefined) {
    if (promo_codeRaw === null) promo_code = null;
    else if (typeof promo_codeRaw === "string")
      promo_code = promo_codeRaw.trim();
    else throw new SubscriptionValidationError("promo_code must be a string");
  }

  return { price_id, plan_id, quantity, metadata, promo_code };
}

type CreateSubscriptionResult =
  | {
      subscription: Subscription;
      invoice: Invoice;
      transaction: Transaction;
    }
  | {
      error:
        | "CUSTOMER_NOT_FOUND"
        | "PRICE_NOT_FOUND"
        | "PRICE_INACTIVE"
        | "PRICE_TYPE_UNSUPPORTED"
        | "PRICE_INTERVAL_MISSING"
        | "PLAN_NOT_FOUND"
        | "PLAN_PRICE_MISMATCH"
        | "PROMO_CODE_NOT_FOUND"
        | "PROMO_CODE_EXPIRED"
        | "PROMO_CODE_MAX_REACHED"
        | "PROMO_CODE_NOT_APPLICABLE"
        | "PROMO_CODE_INVALID";
    };

export async function createSubscriptionForCustomer(
  organizationId: string,
  companyId: string,
  customerId: string,
  input: ReturnType<typeof parseSubscriptionCreateBody>,
): Promise<CreateSubscriptionResult> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId, companyId },
  });
  if (!customer) {
    return { error: "CUSTOMER_NOT_FOUND" };
  }

  const price = await prisma.price.findFirst({
    where: {
      id: input.price_id,
      active: true,
      product: { organizationId },
    },
  });
  if (!price) return { error: "PRICE_NOT_FOUND" };
  if (price.type !== "recurring") return { error: "PRICE_TYPE_UNSUPPORTED" };

  if (!price.interval) return { error: "PRICE_INTERVAL_MISSING" };
  const intervalCount = price.intervalCount ?? 1;

  let planIdToUse: string | null = input.plan_id ?? null;
  if (planIdToUse) {
    const plan = await prisma.plan.findFirst({
      where: { id: planIdToUse, organizationId, priceId: input.price_id },
    });
    if (!plan) return { error: "PLAN_NOT_FOUND" };
    // already filtered by priceId above; keep explicit error for clarity
    if (plan.priceId !== input.price_id) return { error: "PLAN_PRICE_MISMATCH" };
  }

  const now = new Date();
  const currentPeriodEnd = addInterval(now, price.interval, intervalCount);

  const unitAmount = price.unitAmount;
  const subtotalAmount = unitAmount * input.quantity;
  const currency = price.currency;

  const gateway = "test";
  const gatewayReferenceId = `txn_${randomUUID()}`;

  return prisma.$transaction(async (tx) => {
    let appliedPromoCodeId: string | null = null;
    let discountAmount = 0;

    if (input.promo_code) {
      const code = input.promo_code.toUpperCase();
      const promo = await tx.promoCode.findFirst({
        where: { organizationId, code },
      });
      if (!promo || !promo.active) {
        return { error: "PROMO_CODE_NOT_FOUND" };
      }
      if (promo.expiresAt && promo.expiresAt.getTime() < now.getTime()) {
        return { error: "PROMO_CODE_EXPIRED" };
      }
      if (promo.maxUses !== null && promo.maxUses !== undefined) {
        if (promo.timesRedeemed >= promo.maxUses) {
          return { error: "PROMO_CODE_MAX_REACHED" };
        }
      }
      if (promo.appliesToPriceId && promo.appliesToPriceId !== price.id) {
        return { error: "PROMO_CODE_NOT_APPLICABLE" };
      }
      if (
        promo.appliesToProductId &&
        promo.appliesToProductId !== price.productId
      ) {
        return { error: "PROMO_CODE_NOT_APPLICABLE" };
      }

      const kind = promo.kind;
      if (kind === "percent_off") {
        if (typeof promo.percentOff !== "number") {
          return { error: "PROMO_CODE_INVALID" };
        }
        discountAmount = Math.floor(
          (subtotalAmount * promo.percentOff) / 100,
        );
      } else if (kind === "amount_off") {
        if (typeof promo.amountOff !== "number") {
          return { error: "PROMO_CODE_INVALID" };
        }
        discountAmount = Math.min(subtotalAmount, promo.amountOff);
      } else {
        return { error: "PROMO_CODE_INVALID" };
      }
      appliedPromoCodeId = promo.id;

      await tx.promoCode.update({
        where: { id: promo.id },
        data: { timesRedeemed: { increment: 1 } },
      });
    }

    const totalAmount = Math.max(0, subtotalAmount - discountAmount);

    const subscription = await tx.subscription.create({
      data: {
        id: makePrefixedId("subs"),
        organizationId,
        companyId,
        customerId,
        priceId: price.id,
        planId: planIdToUse,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd,
        cancelAt: null,
      },
    });

    const invoice = await tx.invoice.create({
      data: {
        id: makePrefixedId("inv"),
        organizationId,
        companyId,
        customerId,
        subscriptionId: subscription.id,
        promoCodeId: appliedPromoCodeId,
        subtotalAmount,
        discountAmount,
        totalAmount,
        currency,
        status: "paid",
        pdfUrl: null,
      },
    });

    const transaction = await tx.transaction.create({
      data: {
        id: makePrefixedId("txn"),
        organizationId,
        companyId,
        customerId,
        subscriptionId: subscription.id,
        invoiceId: invoice.id,
        amount: totalAmount,
        currency,
        status: "succeeded",
        gateway,
        gatewayReferenceId,
      },
    });

    const updated = await tx.subscription.update({
      where: { id: subscription.id },
      data: { latestInvoiceId: invoice.id },
    });

    return { subscription: updated, invoice, transaction };
  });
}

export async function listSubscriptionsForCustomer(
  organizationId: string,
  companyId: string,
  customerId: string,
) {
  return prisma.subscription.findMany({
    where: { organizationId, companyId, customerId },
    orderBy: { createdAt: "asc" },
    include: {
      price: { include: { product: true } },
      plan: true,
    },
  });
}

export async function getSubscriptionInCustomer(
  organizationId: string,
  companyId: string,
  customerId: string,
  subscriptionId: string,
) {
  return prisma.subscription.findFirst({
    where: { id: subscriptionId, organizationId, companyId, customerId },
    include: {
      price: { include: { product: true } },
      plan: true,
      invoices: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
}

