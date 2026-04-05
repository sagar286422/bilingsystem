import type { Plan, Price, Product } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { makePrefixedId } from "../lib/prefixed-id.js";

export class PlanValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanValidationError";
  }
}

type PriceWithProduct = Price & { product: Product };

async function getPriceInOrganization(
  organizationId: string,
  priceId: string,
): Promise<PriceWithProduct | null> {
  const row = await prisma.price.findFirst({
    where: { id: priceId },
    include: { product: true },
  });
  if (!row || row.product.organizationId !== organizationId) return null;
  return row;
}

function parseMetadata(raw: unknown): Prisma.InputJsonValue {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new PlanValidationError("metadata must be a JSON object");
  }
  return raw as Prisma.InputJsonValue;
}

function parseSlug(raw: unknown): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== "string") {
    throw new PlanValidationError("slug must be a string or null");
  }
  const s = raw.trim().toLowerCase();
  if (s.length === 0) return null;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(s)) {
    throw new PlanValidationError(
      "slug must be lowercase letters, digits, hyphens; start with alphanumeric",
    );
  }
  return s;
}

export function parsePlanCreateBody(body: unknown): {
  name: string;
  price_id: string;
  description?: string | null;
  slug?: string | null;
  active?: boolean;
  metadata?: Prisma.InputJsonValue;
} {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new PlanValidationError("body must be a JSON object");
  }
  const b = body as Record<string, unknown>;
  if (typeof b.name !== "string" || !b.name.trim()) {
    throw new PlanValidationError("name is required");
  }
  if (typeof b.price_id !== "string" || !b.price_id.trim()) {
    throw new PlanValidationError("price_id is required");
  }
  let description: string | null | undefined;
  if (b.description !== undefined) {
    if (b.description === null) description = null;
    else if (typeof b.description === "string") description = b.description;
    else throw new PlanValidationError("description must be a string or null");
  }
  const slug = parseSlug(b.slug);
  const active =
    typeof b.active === "boolean" ? b.active : undefined;
  const metadata = b.metadata !== undefined ? parseMetadata(b.metadata) : undefined;
  return {
    name: b.name.trim(),
    price_id: b.price_id.trim(),
    description,
    slug,
    active,
    metadata,
  };
}

export function parsePlanPatchBody(body: unknown): Partial<{
  name: string;
  description: string | null;
  slug: string | null;
  active: boolean;
  metadata: Prisma.InputJsonValue;
  price_id: string;
}> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new PlanValidationError("body must be a JSON object");
  }
  const b = body as Record<string, unknown>;
  const out: Partial<{
    name: string;
    description: string | null;
    slug: string | null;
    active: boolean;
    metadata: Prisma.InputJsonValue;
    price_id: string;
  }> = {};
  if (b.name !== undefined) {
    if (typeof b.name !== "string" || !b.name.trim()) {
      throw new PlanValidationError("name cannot be empty");
    }
    out.name = b.name.trim();
  }
  if (b.description !== undefined) {
    if (b.description === null) out.description = null;
    else if (typeof b.description === "string") out.description = b.description;
    else throw new PlanValidationError("description must be string or null");
  }
  if (b.slug !== undefined) {
    out.slug = parseSlug(b.slug);
  }
  if (b.active !== undefined) {
    if (typeof b.active !== "boolean") {
      throw new PlanValidationError("active must be boolean");
    }
    out.active = b.active;
  }
  if (b.metadata !== undefined) {
    out.metadata = parseMetadata(b.metadata);
  }
  if (b.price_id !== undefined) {
    if (typeof b.price_id !== "string" || !b.price_id.trim()) {
      throw new PlanValidationError("price_id cannot be empty");
    }
    out.price_id = b.price_id.trim();
  }
  if (Object.keys(out).length === 0) {
    throw new PlanValidationError("no valid fields to update");
  }
  return out;
}

export type PlanWithPrice = Plan & { price: PriceWithProduct };

export async function createPlan(
  organizationId: string,
  input: ReturnType<typeof parsePlanCreateBody>,
): Promise<{ plan?: PlanWithPrice; error?: "PRICE_NOT_FOUND" | "PRICE_INACTIVE" | "SLUG_TAKEN" }> {
  const price = await getPriceInOrganization(organizationId, input.price_id);
  if (!price) return { error: "PRICE_NOT_FOUND" };
  if (!price.active) return { error: "PRICE_INACTIVE" };

  if (input.slug != null) {
    const clash = await prisma.plan.findFirst({
      where: { organizationId, slug: input.slug },
    });
    if (clash) return { error: "SLUG_TAKEN" };
  }

  try {
    const plan = await prisma.plan.create({
      data: {
        id: makePrefixedId("plan"),
        organizationId,
        priceId: input.price_id,
        name: input.name,
        description: input.description ?? null,
        slug: input.slug ?? null,
        active: input.active ?? true,
        metadata: input.metadata ?? {},
      },
      include: { price: { include: { product: true } } },
    });
    return { plan };
  } catch (e) {
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code?: string }).code === "P2002"
    ) {
      return { error: "SLUG_TAKEN" };
    }
    throw e;
  }
}

export async function listPlans(organizationId: string): Promise<PlanWithPrice[]> {
  return prisma.plan.findMany({
    where: { organizationId },
    include: { price: { include: { product: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function getPlanInOrganization(
  organizationId: string,
  planId: string,
): Promise<PlanWithPrice | null> {
  return prisma.plan.findFirst({
    where: { id: planId, organizationId },
    include: { price: { include: { product: true } } },
  });
}

export async function updatePlanInOrganization(
  organizationId: string,
  planId: string,
  patch: ReturnType<typeof parsePlanPatchBody>,
): Promise<
  | { plan: PlanWithPrice }
  | { error: "NOT_FOUND" | "PRICE_NOT_FOUND" | "PRICE_INACTIVE" | "SLUG_TAKEN" }
> {
  const existing = await prisma.plan.findFirst({
    where: { id: planId, organizationId },
  });
  if (!existing) return { error: "NOT_FOUND" };

  if (patch.price_id !== undefined) {
    const price = await getPriceInOrganization(organizationId, patch.price_id);
    if (!price) return { error: "PRICE_NOT_FOUND" };
    if (!price.active) return { error: "PRICE_INACTIVE" };
  }

  if (patch.slug !== undefined && patch.slug !== null) {
    const clash = await prisma.plan.findFirst({
      where: {
        organizationId,
        slug: patch.slug,
        NOT: { id: planId },
      },
    });
    if (clash) return { error: "SLUG_TAKEN" };
  }

  const data: Prisma.PlanUpdateInput = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.slug !== undefined) data.slug = patch.slug;
  if (patch.active !== undefined) data.active = patch.active;
  if (patch.metadata !== undefined) data.metadata = patch.metadata;
  if (patch.price_id !== undefined) {
    data.price = { connect: { id: patch.price_id } };
  }

  try {
    const plan = await prisma.plan.update({
      where: { id: planId },
      data,
      include: { price: { include: { product: true } } },
    });
    return { plan };
  } catch (e) {
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code?: string }).code === "P2002"
    ) {
      return { error: "SLUG_TAKEN" };
    }
    throw e;
  }
}

export async function deletePlanInOrganization(
  organizationId: string,
  planId: string,
): Promise<boolean> {
  const existing = await prisma.plan.findFirst({
    where: { id: planId, organizationId },
  });
  if (!existing) return false;
  await prisma.plan.delete({ where: { id: planId } });
  return true;
}
