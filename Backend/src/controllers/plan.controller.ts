import type { Price, Product } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { PlanWithPrice } from "../services/plan.service.js";
import * as planService from "../services/plan.service.js";

function priceNestedDto(price: Price & { product: Product }) {
  return {
    object: "price" as const,
    id: price.id,
    product_id: price.productId,
    product_name: price.product.name,
    currency: price.currency,
    unit_amount: price.unitAmount,
    type: price.type,
    billing_scheme: price.billingScheme,
    interval: price.interval,
    interval_count: price.intervalCount,
    trial_days: price.trialDays,
    version: price.version,
    active: price.active,
  };
}

function planDto(p: PlanWithPrice) {
  const base = {
    object: "plan" as const,
    id: p.id,
    organization_id: p.organizationId,
    name: p.name,
    description: p.description,
    slug: p.slug,
    active: p.active,
    metadata: p.metadata,
    price_id: p.priceId,
    price: priceNestedDto(p.price),
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
  return base;
}

export async function createPlan(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  try {
    const data = planService.parsePlanCreateBody(request.body);
    const result = await planService.createPlan(orgId, data);
    if (result.error === "PRICE_NOT_FOUND") {
      return reply.status(404).send({
        error: "Not Found",
        code: "PRICE_NOT_FOUND",
        message: "Price not found in this organization.",
      });
    }
    if (result.error === "PRICE_INACTIVE") {
      return reply.status(400).send({
        error: "Bad Request",
        code: "PRICE_INACTIVE",
        message: "Cannot attach an inactive price to a plan. Create a new price or reactivate.",
      });
    }
    if (result.error === "SLUG_TAKEN") {
      return reply.status(409).send({
        error: "Conflict",
        code: "PLAN_SLUG_TAKEN",
        message: "Another plan in this organization already uses this slug.",
      });
    }
    return reply.status(201).send(planDto(result.plan!));
  } catch (e) {
    if (e instanceof planService.PlanValidationError) {
      return reply.status(400).send({
        error: "Bad Request",
        code: "VALIDATION_ERROR",
        message: e.message,
      });
    }
    throw e;
  }
}

export async function listPlans(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const rows = await planService.listPlans(orgId);
  return reply.send({
    object: "list",
    data: rows.map(planDto),
    has_more: false,
  });
}

export async function getPlan(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { planId } = request.params as { planId: string };
  const plan = await planService.getPlanInOrganization(orgId, planId);
  if (!plan) {
    return reply.status(404).send({
      error: "Not Found",
      code: "PLAN_NOT_FOUND",
      message: "Plan not found in this organization.",
    });
  }
  return reply.send(planDto(plan));
}

export async function patchPlan(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { planId } = request.params as { planId: string };

  try {
    const patch = planService.parsePlanPatchBody(request.body);
    const result = await planService.updatePlanInOrganization(orgId, planId, patch);
    if ("plan" in result) {
      return reply.send(planDto(result.plan));
    }
    if (result.error === "NOT_FOUND") {
      return reply.status(404).send({
        error: "Not Found",
        code: "PLAN_NOT_FOUND",
        message: "Plan not found in this organization.",
      });
    }
    if (result.error === "PRICE_NOT_FOUND") {
      return reply.status(404).send({
        error: "Not Found",
        code: "PRICE_NOT_FOUND",
        message: "Price not found in this organization.",
      });
    }
    if (result.error === "PRICE_INACTIVE") {
      return reply.status(400).send({
        error: "Bad Request",
        code: "PRICE_INACTIVE",
        message: "Cannot attach an inactive price to a plan.",
      });
    }
    if (result.error === "SLUG_TAKEN") {
      return reply.status(409).send({
        error: "Conflict",
        code: "PLAN_SLUG_TAKEN",
        message: "Another plan in this organization already uses this slug.",
      });
    }
    return reply.status(500).send({ error: "Internal Server Error" });
  } catch (e) {
    if (e instanceof planService.PlanValidationError) {
      return reply.status(400).send({
        error: "Bad Request",
        code: "VALIDATION_ERROR",
        message: e.message,
      });
    }
    throw e;
  }
}

export async function deletePlan(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { planId } = request.params as { planId: string };
  const ok = await planService.deletePlanInOrganization(orgId, planId);
  if (!ok) {
    return reply.status(404).send({
      error: "Not Found",
      code: "PLAN_NOT_FOUND",
      message: "Plan not found in this organization.",
    });
  }
  return reply.status(204).send();
}
