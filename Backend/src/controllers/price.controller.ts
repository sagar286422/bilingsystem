import type { Price } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import * as currencyService from "../services/currency.service.js";
import * as priceService from "../services/price.service.js";

function priceDto(p: Price) {
  return {
    object: "price" as const,
    id: p.id,
    product_id: p.productId,
    currency: p.currency,
    unit_amount: p.unitAmount,
    type: p.type,
    billing_scheme: p.billingScheme,
    interval: p.interval,
    interval_count: p.intervalCount,
    trial_days: p.trialDays,
    version: p.version,
    active: p.active,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

export async function createPrice(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { productId } = request.params as { productId: string };

  try {
    const input = priceService.parsePriceCreateBody(request.body);
    const result = await priceService.createPrice(orgId, productId, input);
    if (result.error === "PRODUCT_NOT_FOUND") {
      return reply.status(404).send({
        error: "Not Found",
        code: "PRODUCT_NOT_FOUND",
        message: "Product not found in this organization.",
      });
    }
    return reply.status(201).send(priceDto(result.price));
  } catch (e) {
    if (e instanceof priceService.PriceValidationError) {
      return reply.status(400).send({
        error: "Bad Request",
        code: "VALIDATION_ERROR",
        message: e.message,
      });
    }
    if (e instanceof currencyService.CurrencyValidationError) {
      return reply.status(400).send({
        error: "Bad Request",
        code: "INVALID_CURRENCY",
        message: e.message,
      });
    }
    throw e;
  }
}

export async function listPrices(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { productId } = request.params as { productId: string };
  const rows = await priceService.listPrices(orgId, productId);
  if (rows === null) {
    return reply.status(404).send({
      error: "Not Found",
      code: "PRODUCT_NOT_FOUND",
      message: "Product not found in this organization.",
    });
  }
  return reply.send({
    object: "list",
    data: rows.map(priceDto),
    has_more: false,
  });
}

export async function getPrice(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { productId, priceId } = request.params as {
    productId: string;
    priceId: string;
  };
  const price = await priceService.getPriceInOrganization(orgId, productId, priceId);
  if (!price) {
    return reply.status(404).send({
      error: "Not Found",
      code: "PRICE_NOT_FOUND",
      message: "Price not found for this product.",
    });
  }
  return reply.send(priceDto(price));
}

export async function patchPrice(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { productId, priceId } = request.params as {
    productId: string;
    priceId: string;
  };

  const body = request.body;
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return reply.status(400).send({
      error: "Bad Request",
      code: "VALIDATION_ERROR",
      message: "body must be a JSON object",
    });
  }
  const b = body as Record<string, unknown>;
  const keys = Object.keys(b);
  if (keys.length !== 1 || b.active !== false) {
    return reply.status(400).send({
      error: "Bad Request",
      code: "VALIDATION_ERROR",
      message:
        'Price rows are immutable except deactivation. Send only { "active": false }.',
    });
  }

  const price = await priceService.deactivatePrice(orgId, productId, priceId);
  if (!price) {
    return reply.status(404).send({
      error: "Not Found",
      code: "PRICE_NOT_FOUND",
      message: "Price not found for this product.",
    });
  }
  return reply.send(priceDto(price));
}
