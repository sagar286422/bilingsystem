import type {
  Customer,
  Prisma,
  Transaction,
  PaymentPage,
  Price,
  Product,
} from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { makePrefixedId } from "../lib/prefixed-id.js";

const TRANSACTION_WITH_CHECKOUT_INCLUDE = {
  paymentPage: {
    include: {
      price: { include: { product: true } },
    },
  },
} as const;

export type PaymentPageWithPriceProduct = PaymentPage & {
  price: Price & { product: Product };
};

export type TransactionWithCheckout = Transaction & {
  paymentPage: PaymentPageWithPriceProduct | null;
};

export type CustomerListRow = Customer & {
  _count: { transactions: number };
  transactions: TransactionWithCheckout[];
};

export type TransactionDetailRow = TransactionWithCheckout & {
  subscription: {
    id: string;
    status: string;
    priceId: string;
  } | null;
  invoice: {
    id: string;
    status: string;
    totalAmount: number;
    currency: string;
  } | null;
};

export type CustomerDetailRow = Customer & {
  transactions: TransactionDetailRow[];
};

export class CustomerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomerValidationError";
  }
}

function parseEmail(raw: unknown): string {
  if (typeof raw !== "string") {
    throw new CustomerValidationError("email must be a string");
  }
  const email = raw.trim().toLowerCase();
  if (!email) throw new CustomerValidationError("email is required");
  // simple sanity check; Better Auth already validates email on signup
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new CustomerValidationError("email is invalid");
  }
  return email;
}

function parseMetadata(raw: unknown): Prisma.InputJsonValue {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new CustomerValidationError("metadata must be a JSON object");
  }
  return raw as Prisma.InputJsonValue;
}

export function parseCustomerCreateBody(body: unknown): {
  email: string;
  name?: string | null;
  metadata?: Prisma.InputJsonValue;
} {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new CustomerValidationError("body must be a JSON object");
  }
  const b = body as Record<string, unknown>;
  const email = parseEmail(b.email);

  let name: string | null | undefined;
  if (b.name !== undefined) {
    if (b.name === null) name = null;
    else if (typeof b.name === "string") name = b.name.trim() || null;
    else throw new CustomerValidationError("name must be a string or null");
  }

  const metadata =
    b.metadata !== undefined ? parseMetadata(b.metadata) : undefined;

  return { email, name, metadata };
}

export async function createCustomerInCompany(
  organizationId: string,
  companyId: string,
  input: ReturnType<typeof parseCustomerCreateBody>,
): Promise<{ customer?: Customer; error?: "COMPANY_NOT_FOUND" | "EMAIL_ALREADY_EXISTS" }> {
  const company = await prisma.company.findFirst({
    where: { id: companyId, organizationId },
  });
  if (!company) return { error: "COMPANY_NOT_FOUND" };

  try {
    const customer = await prisma.customer.create({
      data: {
        id: makePrefixedId("cust"),
        organizationId,
        companyId,
        email: input.email,
        name: input.name ?? null,
        metadata: input.metadata ?? {},
      },
    });
    return { customer };
  } catch (e) {
    // unique([companyId, email])
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code?: string }).code === "P2002"
    ) {
      return { error: "EMAIL_ALREADY_EXISTS" };
    }
    throw e;
  }
}

export async function listCustomersInCompany(
  organizationId: string,
  companyId: string,
): Promise<Customer[]> {
  return prisma.customer.findMany({
    where: { organizationId, companyId },
    orderBy: { createdAt: "asc" },
  });
}

/** Customers with recent transactions (payment pages + catalog metadata) for dashboard list. */
export async function listCustomersWithPurchaseActivity(
  organizationId: string,
  companyId: string,
): Promise<{
  rows: CustomerListRow[];
  succeededStats: Map<
    string,
    { count: number; lastAt: Date | null }
  >;
}> {
  const rows = await prisma.customer.findMany({
    where: { organizationId, companyId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { transactions: true } },
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: TRANSACTION_WITH_CHECKOUT_INCLUDE,
      },
    },
  });
  if (rows.length === 0) {
    return { rows: [], succeededStats: new Map() };
  }
  const customerIds = rows.map((r) => r.id);
  const grouped = await prisma.transaction.groupBy({
    by: ["customerId"],
    where: {
      organizationId,
      companyId,
      customerId: { in: customerIds },
      status: "succeeded",
    },
    _count: { _all: true },
    _max: { createdAt: true },
  });
  const succeededStats = new Map(
    grouped.map((g) => [
      g.customerId,
      { count: g._count._all, lastAt: g._max.createdAt },
    ]),
  );
  return { rows, succeededStats };
}

export async function getCustomerInCompany(
  organizationId: string,
  companyId: string,
  customerId: string,
): Promise<Customer | null> {
  return prisma.customer.findFirst({
    where: { id: customerId, organizationId, companyId },
  });
}

export async function getCustomerInCompanyWithTransactions(
  organizationId: string,
  companyId: string,
  customerId: string,
): Promise<CustomerDetailRow | null> {
  return prisma.customer.findFirst({
    where: { id: customerId, organizationId, companyId },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        include: {
          ...TRANSACTION_WITH_CHECKOUT_INCLUDE,
          subscription: {
            select: { id: true, status: true, priceId: true },
          },
          invoice: {
            select: {
              id: true,
              status: true,
              totalAmount: true,
              currency: true,
            },
          },
        },
      },
    },
  });
}

/** Resolve catalog product/price for transactions that only have `metadata.price_id` (no payment page). */
export async function loadPricesForTransactionMetadata(
  organizationId: string,
  transactions: Array<{ metadata: unknown }>,
): Promise<Map<string, { price: Price; product: Product }>> {
  const ids = new Set<string>();
  for (const t of transactions) {
    if (!t.metadata || typeof t.metadata !== "object" || Array.isArray(t.metadata)) {
      continue;
    }
    const pid = (t.metadata as Record<string, unknown>).price_id;
    if (typeof pid === "string" && pid.trim()) ids.add(pid.trim());
  }
  if (ids.size === 0) return new Map();
  const prices = await prisma.price.findMany({
    where: {
      id: { in: [...ids] },
      product: { organizationId },
    },
    include: { product: true },
  });
  return new Map(prices.map((p) => [p.id, { price: p, product: p.product }]));
}

