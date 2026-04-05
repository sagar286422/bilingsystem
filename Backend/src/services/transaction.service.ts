import type { Transaction } from "@prisma/client";
import { prisma } from "../db/prisma.js";

export async function listTransactionsInCompany(
  organizationId: string,
  companyId: string,
): Promise<Transaction[]> {
  return prisma.transaction.findMany({
    where: { organizationId, companyId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTransactionInCompany(
  organizationId: string,
  companyId: string,
  transactionId: string,
): Promise<Transaction | null> {
  return prisma.transaction.findFirst({
    where: { id: transactionId, organizationId, companyId },
  });
}

