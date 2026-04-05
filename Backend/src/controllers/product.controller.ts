import type { Product } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import * as productService from "../services/product.service.js";

function productDto(p: Product) {
  return {
    object: "product" as const,
    id: p.id,
    organization_id: p.organizationId,
    name: p.name,
    description: p.description,
    active: p.active,
    metadata: p.metadata,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

export async function createProduct(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  try {
    const data = productService.parseProductCreateBody(request.body);
    const product = await productService.createProduct(orgId, data);
    return reply.status(201).send(productDto(product));
  } catch (e) {
    if (e instanceof productService.ProductValidationError) {
      return reply.status(400).send({
        error: "Bad Request",
        code: "VALIDATION_ERROR",
        message: e.message,
      });
    }
    throw e;
  }
}

export async function listProducts(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const rows = await productService.listProducts(orgId);
  return reply.send({
    object: "list",
    data: rows.map(productDto),
    has_more: false,
  });
}

export async function getProduct(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { productId } = request.params as { productId: string };
  const product = await productService.getProductInOrganization(orgId, productId);
  if (!product) {
    return reply.status(404).send({
      error: "Not Found",
      code: "PRODUCT_NOT_FOUND",
      message: "Product not found in this organization.",
    });
  }
  return reply.send(productDto(product));
}

export async function patchProduct(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { productId } = request.params as { productId: string };

  try {
    const patch = productService.parseProductPatchBody(request.body);
    const product = await productService.updateProductInOrganization(
      orgId,
      productId,
      patch,
    );
    if (!product) {
      return reply.status(404).send({
        error: "Not Found",
        code: "PRODUCT_NOT_FOUND",
        message: "Product not found in this organization.",
      });
    }
    return reply.send(productDto(product));
  } catch (e) {
    if (e instanceof productService.ProductValidationError) {
      return reply.status(400).send({
        error: "Bad Request",
        code: "VALIDATION_ERROR",
        message: e.message,
      });
    }
    throw e;
  }
}

export async function deleteProduct(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { productId } = request.params as { productId: string };
  const ok = await productService.deleteProductInOrganization(orgId, productId);
  if (!ok) {
    return reply.status(404).send({
      error: "Not Found",
      code: "PRODUCT_NOT_FOUND",
      message: "Product not found in this organization.",
    });
  }
  return reply.status(204).send();
}
