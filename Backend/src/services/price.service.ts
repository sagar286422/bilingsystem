import { prisma } from "../db/prisma.js";
import * as currencyService from "./currency.service.js";
import { getProductInOrganization } from "./product.service.js";
import { makePrefixedId } from "../lib/prefixed-id.js";

export class PriceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PriceValidationError";
  }
}

export function parsePriceCreateBody(body: unknown): {
  currency: string;
  unit_amount: number;
  type: "one_time" | "recurring";
  billing_scheme?: string;
  interval?: string;
  interval_count?: number;
  trial_days?: number | null;
} {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new PriceValidationError("body must be a JSON object");
  }
  const b = body as Record<string, unknown>;

  if (typeof b.currency !== "string" || !b.currency.trim()) {
    throw new PriceValidationError("currency is required");
  }
  const currency = b.currency.trim().toUpperCase();
  if (currency.length !== 3) {
    throw new PriceValidationError("currency must be 3 letters");
  }

  if (typeof b.unit_amount !== "number" || !Number.isInteger(b.unit_amount)) {
    throw new PriceValidationError("unit_amount must be an integer (minor units, e.g. cents)");
  }
  if (b.unit_amount < 0) {
    throw new PriceValidationError("unit_amount must be >= 0");
  }

  const type = b.type;
  if (type !== "one_time" && type !== "recurring") {
    throw new PriceValidationError('type must be "one_time" or "recurring"');
  }

  let interval: string | undefined;
  let interval_count = 1;
  if (type === "recurring") {
    if (typeof b.interval !== "string" || !b.interval.trim()) {
      throw new PriceValidationError(
        "interval is required for recurring prices (e.g. month, year)",
      );
    }
    interval = b.interval.trim().toLowerCase();
    if (interval !== "month" && interval !== "year") {
      throw new PriceValidationError('interval must be "month" or "year"');
    }
    if (b.interval_count !== undefined) {
      if (typeof b.interval_count !== "number" || !Number.isInteger(b.interval_count) || b.interval_count < 1) {
        throw new PriceValidationError("interval_count must be a positive integer");
      }
      interval_count = b.interval_count;
    }
  }

  const billing_scheme =
    typeof b.billing_scheme === "string" && b.billing_scheme.trim()
      ? b.billing_scheme.trim()
      : "fixed";

  let trial_days: number | null | undefined;
  if (b.trial_days !== undefined && b.trial_days !== null) {
    if (typeof b.trial_days !== "number" || !Number.isInteger(b.trial_days) || b.trial_days < 0) {
      throw new PriceValidationError("trial_days must be a non-negative integer");
    }
    trial_days = b.trial_days;
  } else if (b.trial_days === null) {
    trial_days = null;
  }

  return {
    currency,
    unit_amount: b.unit_amount,
    type,
    billing_scheme,
    interval,
    interval_count,
    trial_days,
  };
}

export async function createPrice(
  organizationId: string,
  productId: string,
  input: ReturnType<typeof parsePriceCreateBody>,
) {
  const product = await getProductInOrganization(organizationId, productId);
  if (!product) return { error: "PRODUCT_NOT_FOUND" as const };

  await currencyService.requireActiveCurrencyCode(input.currency);

  const agg = await prisma.price.aggregate({
    where: { productId },
    _max: { version: true },
  });
  const nextVersion = (agg._max.version ?? 0) + 1;

  const row = await prisma.price.create({
    data: {
      id: makePrefixedId("price"),
      productId,
      currency: input.currency,
      unitAmount: input.unit_amount,
      type: input.type,
      billingScheme: input.billing_scheme ?? "fixed",
      interval: input.type === "recurring" ? input.interval! : null,
      intervalCount:
        input.type === "recurring" ? (input.interval_count ?? 1) : null,
      trialDays: input.trial_days ?? null,
      version: nextVersion,
      active: true,
    },
  });
  return { price: row };
}

export async function listPrices(organizationId: string, productId: string) {
  const product = await getProductInOrganization(organizationId, productId);
  if (!product) return null;
  return prisma.price.findMany({
    where: { productId },
    orderBy: [{ version: "asc" }],
  });
}

export async function getPriceInOrganization(
  organizationId: string,
  productId: string,
  priceId: string,
) {
  const product = await getProductInOrganization(organizationId, productId);
  if (!product) return null;
  return prisma.price.findFirst({
    where: { id: priceId, productId },
  });
}

export async function deactivatePrice(
  organizationId: string,
  productId: string,
  priceId: string,
) {
  const price = await getPriceInOrganization(organizationId, productId, priceId);
  if (!price) return null;
  return prisma.price.update({
    where: { id: priceId },
    data: { active: false },
  });
}
