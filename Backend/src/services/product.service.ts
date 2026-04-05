import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { makePrefixedId } from "../lib/prefixed-id.js";

export class ProductValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductValidationError";
  }
}

function parseMetadata(raw: unknown): Prisma.InputJsonValue {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ProductValidationError("metadata must be a JSON object");
  }
  return raw as Prisma.InputJsonValue;
}

export function parseProductCreateBody(body: unknown): {
  name: string;
  description?: string | null;
  active?: boolean;
  metadata?: Prisma.InputJsonValue;
} {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ProductValidationError("body must be a JSON object");
  }
  const b = body as Record<string, unknown>;
  if (typeof b.name !== "string" || !b.name.trim()) {
    throw new ProductValidationError("name is required");
  }
  let description: string | null | undefined;
  if (b.description !== undefined) {
    if (b.description === null) description = null;
    else if (typeof b.description === "string") description = b.description;
    else throw new ProductValidationError("description must be a string or null");
  }
  const active =
    typeof b.active === "boolean" ? b.active : undefined;
  const metadata = b.metadata !== undefined ? parseMetadata(b.metadata) : undefined;
  return {
    name: b.name.trim(),
    description,
    active,
    metadata,
  };
}

export function parseProductPatchBody(body: unknown): Partial<{
  name: string;
  description: string | null;
  active: boolean;
  metadata: Prisma.InputJsonValue;
}> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ProductValidationError("body must be a JSON object");
  }
  const b = body as Record<string, unknown>;
  const out: Partial<{
    name: string;
    description: string | null;
    active: boolean;
    metadata: Prisma.InputJsonValue;
  }> = {};
  if (b.name !== undefined) {
    if (typeof b.name !== "string" || !b.name.trim()) {
      throw new ProductValidationError("name cannot be empty");
    }
    out.name = b.name.trim();
  }
  if (b.description !== undefined) {
    if (b.description === null) out.description = null;
    else if (typeof b.description === "string") out.description = b.description;
    else throw new ProductValidationError("description must be string or null");
  }
  if (b.active !== undefined) {
    if (typeof b.active !== "boolean") {
      throw new ProductValidationError("active must be boolean");
    }
    out.active = b.active;
  }
  if (b.metadata !== undefined) {
    out.metadata = parseMetadata(b.metadata);
  }
  if (Object.keys(out).length === 0) {
    throw new ProductValidationError("no valid fields to update");
  }
  return out;
}

export async function createProduct(
  organizationId: string,
  input: ReturnType<typeof parseProductCreateBody>,
) {
  return prisma.product.create({
    data: {
      id: makePrefixedId("prod"),
      organizationId,
      name: input.name,
      description: input.description ?? null,
      active: input.active ?? true,
      metadata: input.metadata ?? {},
    },
  });
}

export async function listProducts(organizationId: string) {
  return prisma.product.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getProductInOrganization(
  organizationId: string,
  productId: string,
) {
  return prisma.product.findFirst({
    where: { id: productId, organizationId },
  });
}

export async function updateProductInOrganization(
  organizationId: string,
  productId: string,
  patch: ReturnType<typeof parseProductPatchBody>,
) {
  const existing = await getProductInOrganization(organizationId, productId);
  if (!existing) return null;
  const data: Prisma.ProductUpdateInput = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.active !== undefined) data.active = patch.active;
  if (patch.metadata !== undefined) data.metadata = patch.metadata;
  return prisma.product.update({
    where: { id: productId },
    data,
  });
}

export async function deleteProductInOrganization(
  organizationId: string,
  productId: string,
) {
  const existing = await getProductInOrganization(organizationId, productId);
  if (!existing) return false;
  await prisma.product.delete({ where: { id: productId } });
  return true;
}
