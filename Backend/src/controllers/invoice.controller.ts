import type { FastifyReply, FastifyRequest } from "fastify";
import type { InvoiceWithCustomer } from "../services/invoice.service.js";
import * as invoiceService from "../services/invoice.service.js";

function invoiceDto(i: InvoiceWithCustomer) {
  return {
    object: "invoice" as const,
    id: i.id,
    organization_id: i.organizationId,
    company_id: i.companyId,
    customer_id: i.customerId,
    subscription_id: i.subscriptionId,
    promo_code_id: i.promoCodeId,
    subtotal_amount: i.subtotalAmount,
    discount_amount: i.discountAmount,
    total_amount: i.totalAmount,
    currency: i.currency,
    status: i.status,
    pdf_url: i.pdfUrl,
    created_at: i.createdAt.toISOString(),
    updated_at: i.updatedAt.toISOString(),
    customer: {
      id: i.customer.id,
      email: i.customer.email,
      name: i.customer.name,
    },
  };
}

export async function listInvoices(request: FastifyRequest, reply: FastifyReply) {
  const organizationId = request.orgMember?.organizationId;
  if (!organizationId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }
  const { companyId } = request.params as { companyId: string };

  const rows = await invoiceService.listInvoicesInCompany(organizationId, companyId);
  return reply.send({
    object: "list",
    data: rows.map(invoiceDto),
    has_more: false,
  });
}

export async function getInvoice(request: FastifyRequest, reply: FastifyReply) {
  const organizationId = request.orgMember?.organizationId;
  if (!organizationId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }
  const { companyId, invoiceId } = request.params as {
    companyId: string;
    invoiceId: string;
  };

  const row = await invoiceService.getInvoiceInCompany(
    organizationId,
    companyId,
    invoiceId,
  );
  if (!row) {
    return reply.status(404).send({
      error: "Not Found",
      code: "INVOICE_NOT_FOUND",
      message: "Invoice not found in this company/org.",
    });
  }

  return reply.send(invoiceDto(row));
}

export async function createInvoice(request: FastifyRequest, reply: FastifyReply) {
  const organizationId = request.orgMember?.organizationId;
  if (!organizationId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }
  const { companyId } = request.params as { companyId: string };

  try {
    const input = invoiceService.parseCreateInvoiceBody(request.body);
    const result = await invoiceService.createInvoiceInCompany(
      organizationId,
      companyId,
      input,
    );
    if ("error" in result) {
      if (result.error === "CUSTOMER_NOT_FOUND") {
        return reply.status(404).send({
          error: "Not Found",
          code: "CUSTOMER_NOT_FOUND",
          message: "Customer not found for this company.",
        });
      }
      if (result.error === "SUBSCRIPTION_MISMATCH") {
        return reply.status(400).send({
          error: "Bad Request",
          code: "SUBSCRIPTION_MISMATCH",
          message: "subscription_id must belong to this customer and company.",
        });
      }
      return reply.status(404).send({
        error: "Not Found",
        code: "PROMO_NOT_FOUND",
        message: "Promo code not found in this organization.",
      });
    }
    return reply.status(201).send(invoiceDto(result.invoice));
  } catch (e) {
    if (e instanceof invoiceService.InvoiceValidationError) {
      return reply.status(400).send({
        error: "Bad Request",
        code: "VALIDATION_ERROR",
        message: e.message,
      });
    }
    throw e;
  }
}

export async function patchInvoice(request: FastifyRequest, reply: FastifyReply) {
  const organizationId = request.orgMember?.organizationId;
  if (!organizationId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }
  const { companyId, invoiceId } = request.params as {
    companyId: string;
    invoiceId: string;
  };

  try {
    const patch = invoiceService.parsePatchInvoiceBody(request.body);
    const row = await invoiceService.patchInvoiceInCompany(
      organizationId,
      companyId,
      invoiceId,
      patch,
    );
    if (!row) {
      return reply.status(404).send({
        error: "Not Found",
        code: "INVOICE_NOT_FOUND",
        message: "Invoice not found in this company/org.",
      });
    }
    return reply.send(invoiceDto(row));
  } catch (e) {
    if (e instanceof invoiceService.InvoiceValidationError) {
      return reply.status(400).send({
        error: "Bad Request",
        code: "VALIDATION_ERROR",
        message: e.message,
      });
    }
    throw e;
  }
}

