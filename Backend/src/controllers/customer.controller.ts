import type { Customer } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  purchaseActivityLineDto,
  type PurchaseActivityLine,
} from "../lib/customer-purchase-dto.js";
import type { CustomerListRow, CustomerDetailRow } from "../services/customer.service.js";
import * as customerService from "../services/customer.service.js";

function customerDto(c: Customer) {
  return {
    object: "customer" as const,
    id: c.id,
    organization_id: c.organizationId,
    company_id: c.companyId,
    email: c.email,
    name: c.name,
    metadata: c.metadata,
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
  };
}

function customerWithActivityDto(
  row: CustomerListRow,
  metaMap: Map<string, { price: import("@prisma/client").Price; product: import("@prisma/client").Product }>,
  stats: { count: number; lastAt: Date | null } | undefined,
) {
  const succeededInSlice = row.transactions.filter((t) => t.status === "succeeded");
  const lastOk = succeededInSlice[0] ?? null;
  const lastName = lastOk
    ? purchaseActivityLineDto(lastOk, metaMap).product_name
    : null;
  const recent: PurchaseActivityLine[] = row.transactions.slice(0, 8).map((t) =>
    purchaseActivityLineDto(t, metaMap),
  );
  return {
    ...customerDto(row),
    purchase_summary: {
      transaction_count: row._count.transactions,
      succeeded_count: stats?.count ?? 0,
      last_succeeded_at: stats?.lastAt ? stats.lastAt.toISOString() : null,
      last_product_name: lastName,
      recent_activity: recent,
    },
  };
}

function customerDetailDto(
  row: CustomerDetailRow,
  metaMap: Map<string, { price: import("@prisma/client").Price; product: import("@prisma/client").Product }>,
) {
  return {
    ...customerDto(row),
    transactions: row.transactions.map((t) => purchaseActivityLineDto(t, metaMap)),
  };
}

export async function createCustomer(request: FastifyRequest, reply: FastifyReply) {
  const organizationId = request.orgMember?.organizationId;
  if (!organizationId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { companyId } = request.params as { companyId: string };
  try {
    const input = customerService.parseCustomerCreateBody(request.body);
    const result = await customerService.createCustomerInCompany(
      organizationId,
      companyId,
      input,
    );
    if (result.error === "COMPANY_NOT_FOUND") {
      return reply.status(404).send({
        error: "Not Found",
        code: "COMPANY_NOT_FOUND",
        message: "Company not found in this organization.",
      });
    }
    if (result.error === "EMAIL_ALREADY_EXISTS") {
      return reply.status(409).send({
        error: "Conflict",
        code: "CUSTOMER_EMAIL_ALREADY_EXISTS",
        message: "Customer email already exists for this company.",
      });
    }

    return reply.status(201).send(customerDto(result.customer!));
  } catch (e) {
    if (e instanceof customerService.CustomerValidationError) {
      return reply.status(400).send({
        error: "Bad Request",
        code: "VALIDATION_ERROR",
        message: e.message,
      });
    }
    throw e;
  }
}

export async function listCustomers(request: FastifyRequest, reply: FastifyReply) {
  const organizationId = request.orgMember?.organizationId;
  if (!organizationId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { companyId } = request.params as { companyId: string };
  const { rows, succeededStats } =
    await customerService.listCustomersWithPurchaseActivity(
      organizationId,
      companyId,
    );

  const allTx = rows.flatMap((r) => r.transactions);
  const metaMap = await customerService.loadPricesForTransactionMetadata(
    organizationId,
    allTx,
  );

  return reply.send({
    object: "list",
    data: rows.map((r) =>
      customerWithActivityDto(r, metaMap, succeededStats.get(r.id)),
    ),
    has_more: false,
  });
}

export async function getCustomer(request: FastifyRequest, reply: FastifyReply) {
  const organizationId = request.orgMember?.organizationId;
  if (!organizationId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { companyId, customerId } = request.params as {
    companyId: string;
    customerId: string;
  };

  const q = request.query as { expand?: string };
  const expandTx = q.expand?.split(",").includes("transactions");

  if (expandTx) {
    const row = await customerService.getCustomerInCompanyWithTransactions(
      organizationId,
      companyId,
      customerId,
    );
    if (!row) {
      return reply.status(404).send({
        error: "Not Found",
        code: "CUSTOMER_NOT_FOUND",
        message: "Customer not found in this company.",
      });
    }
    const metaMap = await customerService.loadPricesForTransactionMetadata(
      organizationId,
      row.transactions,
    );
    return reply.send(customerDetailDto(row, metaMap));
  }

  const row = await customerService.getCustomerInCompany(
    organizationId,
    companyId,
    customerId,
  );
  if (!row) {
    return reply.status(404).send({
      error: "Not Found",
      code: "CUSTOMER_NOT_FOUND",
      message: "Customer not found in this company.",
    });
  }
  return reply.send(customerDto(row));
}

