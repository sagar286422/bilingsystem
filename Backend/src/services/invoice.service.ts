import type { Invoice, Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { makePrefixedId } from "../lib/prefixed-id.js";

export class InvoiceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceValidationError";
  }
}

const INVOICE_STATUSES = new Set([
  "draft",
  "open",
  "paid",
  "void",
  "uncollectible",
]);

const invoiceCustomerInclude = {
  customer: { select: { id: true, email: true, name: true } },
} as const;

export type InvoiceWithCustomer = Invoice & {
  customer: { id: string; email: string; name: string | null };
};

export async function listInvoicesInCompany(
  organizationId: string,
  companyId: string,
): Promise<InvoiceWithCustomer[]> {
  return prisma.invoice.findMany({
    where: { organizationId, companyId },
    orderBy: { createdAt: "desc" },
    include: invoiceCustomerInclude,
  });
}

export async function getInvoiceInCompany(
  organizationId: string,
  companyId: string,
  invoiceId: string,
): Promise<InvoiceWithCustomer | null> {
  return prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId, companyId },
    include: invoiceCustomerInclude,
  });
}

export function parseCreateInvoiceBody(body: unknown): {
  customer_id: string;
  currency: string;
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  status: string;
  subscription_id: string | null;
  promo_code_id: string | null;
} {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new InvoiceValidationError("body must be a JSON object");
  }
  const b = body as Record<string, unknown>;
  const customer_id =
    typeof b.customer_id === "string" ? b.customer_id.trim() : "";
  if (!customer_id) {
    throw new InvoiceValidationError("customer_id is required");
  }
  const currency =
    typeof b.currency === "string" ? b.currency.trim().toUpperCase() : "";
  if (!currency || currency.length !== 3) {
    throw new InvoiceValidationError("currency must be ISO 4217 (3 chars)");
  }
  const subtotal_amount = b.subtotal_amount;
  if (typeof subtotal_amount !== "number" || !Number.isInteger(subtotal_amount)) {
    throw new InvoiceValidationError("subtotal_amount must be an integer (minor units)");
  }
  if (subtotal_amount < 0) {
    throw new InvoiceValidationError("subtotal_amount must be >= 0");
  }
  let discount_amount = 0;
  if (b.discount_amount !== undefined) {
    if (typeof b.discount_amount !== "number" || !Number.isInteger(b.discount_amount)) {
      throw new InvoiceValidationError("discount_amount must be an integer");
    }
    discount_amount = b.discount_amount;
    if (discount_amount < 0 || discount_amount > subtotal_amount) {
      throw new InvoiceValidationError("discount_amount invalid");
    }
  }
  const total_amount = b.total_amount;
  if (typeof total_amount !== "number" || !Number.isInteger(total_amount)) {
    throw new InvoiceValidationError("total_amount must be an integer (minor units)");
  }
  if (total_amount !== subtotal_amount - discount_amount) {
    throw new InvoiceValidationError(
      "total_amount must equal subtotal_amount - discount_amount",
    );
  }

  let status = "draft";
  if (b.status !== undefined) {
    if (typeof b.status !== "string" || !b.status.trim()) {
      throw new InvoiceValidationError("status must be a non-empty string");
    }
    status = b.status.trim().toLowerCase();
    if (!INVOICE_STATUSES.has(status)) {
      throw new InvoiceValidationError(
        `status must be one of: ${[...INVOICE_STATUSES].join(", ")}`,
      );
    }
  }

  let subscription_id: string | null = null;
  if (b.subscription_id !== undefined && b.subscription_id !== null) {
    if (typeof b.subscription_id !== "string" || !b.subscription_id.trim()) {
      throw new InvoiceValidationError("subscription_id must be a string or null");
    }
    subscription_id = b.subscription_id.trim();
  }

  let promo_code_id: string | null = null;
  if (b.promo_code_id !== undefined && b.promo_code_id !== null) {
    if (typeof b.promo_code_id !== "string" || !b.promo_code_id.trim()) {
      throw new InvoiceValidationError("promo_code_id must be a string or null");
    }
    promo_code_id = b.promo_code_id.trim();
  }

  return {
    customer_id,
    currency,
    subtotal_amount,
    discount_amount,
    total_amount,
    status,
    subscription_id,
    promo_code_id,
  };
}

export async function createInvoiceInCompany(
  organizationId: string,
  companyId: string,
  input: ReturnType<typeof parseCreateInvoiceBody>,
): Promise<
  | { invoice: InvoiceWithCustomer }
  | { error: "CUSTOMER_NOT_FOUND" | "SUBSCRIPTION_MISMATCH" | "PROMO_NOT_FOUND" }
> {
  const customer = await prisma.customer.findFirst({
    where: {
      id: input.customer_id,
      organizationId,
      companyId,
    },
  });
  if (!customer) return { error: "CUSTOMER_NOT_FOUND" };

  if (input.subscription_id) {
    const sub = await prisma.subscription.findFirst({
      where: {
        id: input.subscription_id,
        organizationId,
        companyId,
        customerId: input.customer_id,
      },
    });
    if (!sub) return { error: "SUBSCRIPTION_MISMATCH" };
  }

  if (input.promo_code_id) {
    const promo = await prisma.promoCode.findFirst({
      where: { id: input.promo_code_id, organizationId },
    });
    if (!promo) return { error: "PROMO_NOT_FOUND" };
  }

  const row = await prisma.invoice.create({
    data: {
      id: makePrefixedId("inv"),
      organizationId,
      companyId,
      customerId: input.customer_id,
      subscriptionId: input.subscription_id,
      subtotalAmount: input.subtotal_amount,
      discountAmount: input.discount_amount,
      promoCodeId: input.promo_code_id,
      totalAmount: input.total_amount,
      currency: input.currency,
      status: input.status,
    },
    include: invoiceCustomerInclude,
  });

  return { invoice: row };
}

export function parsePatchInvoiceBody(body: unknown): { status?: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new InvoiceValidationError("body must be a JSON object");
  }
  const b = body as Record<string, unknown>;
  const out: { status?: string } = {};
  if (b.status !== undefined) {
    if (typeof b.status !== "string" || !b.status.trim()) {
      throw new InvoiceValidationError("status must be a non-empty string");
    }
    const s = b.status.trim().toLowerCase();
    if (!INVOICE_STATUSES.has(s)) {
      throw new InvoiceValidationError(
        `status must be one of: ${[...INVOICE_STATUSES].join(", ")}`,
      );
    }
    out.status = s;
  }
  if (Object.keys(out).length === 0) {
    throw new InvoiceValidationError("At least status is required to update.");
  }
  return out;
}

export async function patchInvoiceInCompany(
  organizationId: string,
  companyId: string,
  invoiceId: string,
  patch: ReturnType<typeof parsePatchInvoiceBody>,
): Promise<InvoiceWithCustomer | null> {
  const existing = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId, companyId },
  });
  if (!existing) return null;

  const data: Prisma.InvoiceUpdateInput = {};
  if (patch.status !== undefined) data.status = patch.status;

  return prisma.invoice.update({
    where: { id: invoiceId },
    data,
    include: invoiceCustomerInclude,
  });
}
