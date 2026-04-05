import type { Transaction } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import * as transactionService from "../services/transaction.service.js";

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

export async function listTransactions(request: FastifyRequest, reply: FastifyReply) {
  const organizationId = request.orgMember?.organizationId;
  if (!organizationId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }
  const { companyId } = request.params as { companyId: string };

  const rows = await transactionService.listTransactionsInCompany(
    organizationId,
    companyId,
  );
  return reply.send({
    object: "list",
    data: rows.map(transactionDto),
    has_more: false,
  });
}

export async function getTransaction(request: FastifyRequest, reply: FastifyReply) {
  const organizationId = request.orgMember?.organizationId;
  if (!organizationId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }
  const { companyId, transactionId } = request.params as {
    companyId: string;
    transactionId: string;
  };

  const row = await transactionService.getTransactionInCompany(
    organizationId,
    companyId,
    transactionId,
  );
  if (!row) {
    return reply.status(404).send({
      error: "Not Found",
      code: "TRANSACTION_NOT_FOUND",
      message: "Transaction not found in this company/org.",
    });
  }

  return reply.send(transactionDto(row));
}

