import { prisma } from "../db/prisma.js";

/** Thrown when a currency code is unknown, inactive, or malformed. */
export class CurrencyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CurrencyValidationError";
  }
}

export async function listActiveCurrencies() {
  return prisma.currency.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });
}

/**
 * Ensures the code exists in the `currency` table and is active.
 * Companies, prices, and future tax logic should use this catalog as source of truth.
 */
export async function requireActiveCurrencyCode(code: string) {
  const normalized = code.trim().toUpperCase();
  if (normalized.length !== 3) {
    throw new CurrencyValidationError("currency must be a 3-letter ISO 4217 code");
  }
  const row = await prisma.currency.findUnique({
    where: { code: normalized },
  });
  if (!row || !row.active) {
    throw new CurrencyValidationError(
      `Currency "${normalized}" is not in the catalog or is inactive. Run prisma seed / sync currencies first.`,
    );
  }
  return row;
}
