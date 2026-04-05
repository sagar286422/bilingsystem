import type { PromoCode } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import * as promoService from "../services/promo-code.service.js";

function promoCodeDto(p: PromoCode) {
  return {
    object: "promo_code" as const,
    id: p.id,
    organization_id: p.organizationId,
    code: p.code,
    name: p.name,
    active: p.active,
    kind: p.kind,
    percent_off: p.percentOff,
    amount_off: p.amountOff,
    max_uses: p.maxUses,
    times_redeemed: p.timesRedeemed,
    expires_at: p.expiresAt,
    applies_to_product_id: p.appliesToProductId,
    applies_to_price_id: p.appliesToPriceId,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

export async function createPromoCode(request: FastifyRequest, reply: FastifyReply) {
  const organizationId = request.orgMember?.organizationId;
  if (!organizationId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  try {
    const input = promoService.parsePromoCodeCreateBody(request.body);
    const row = await promoService.createPromoCode(organizationId, input);
    return reply.status(201).send(promoCodeDto(row));
  } catch (e) {
    if (e instanceof promoService.PromoCodeValidationError) {
      return reply.status(400).send({
        error: "Bad Request",
        code: "VALIDATION_ERROR",
        message: e.message,
      });
    }
    // unique violation etc
    if (e && typeof e === "object" && "code" in e) {
      const code = (e as { code?: string }).code;
      if (code === "P2002") {
        return reply.status(409).send({
          error: "Conflict",
          code: "PROMO_CODE_ALREADY_EXISTS",
          message: "A promo code with this code already exists in this org.",
        });
      }
    }
    throw e;
  }
}

export async function listPromoCodes(request: FastifyRequest, reply: FastifyReply) {
  const organizationId = request.orgMember?.organizationId;
  if (!organizationId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const rows = await promoService.listPromoCodes(organizationId);
  return reply.send({
    object: "list",
    data: rows.map(promoCodeDto),
    has_more: false,
  });
}

export async function revokePromoCode(request: FastifyRequest, reply: FastifyReply) {
  const organizationId = request.orgMember?.organizationId;
  if (!organizationId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }
  const { promoCodeId } = request.params as { promoCodeId: string };

  const ok = await promoService.revokePromoCode(organizationId, promoCodeId);
  if (!ok) {
    return reply.status(404).send({
      error: "Not Found",
      code: "PROMO_CODE_NOT_FOUND",
      message: "Promo code not found in this organization.",
    });
  }

  return reply.status(204).send();
}

