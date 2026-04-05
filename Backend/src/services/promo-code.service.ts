import type { PromoCode, Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { makePrefixedId } from "../lib/prefixed-id.js";

export class PromoCodeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PromoCodeValidationError";
  }
}

type PromoCodeKind = "percent_off" | "amount_off";

function parseCode(raw: unknown): string {
  if (typeof raw !== "string") {
    throw new PromoCodeValidationError("code must be a string");
  }
  const code = raw.trim().toUpperCase();
  if (!code) throw new PromoCodeValidationError("code is required");
  if (!/^[A-Z0-9_-]+$/.test(code)) {
    throw new PromoCodeValidationError(
      "code must be uppercase letters/digits with optional _ or -",
    );
  }
  return code;
}

function parseOptionalString(raw: unknown): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== "string") {
    throw new PromoCodeValidationError("value must be a string");
  }
  const s = raw.trim();
  return s.length ? s : null;
}

function parseOptionalDate(raw: unknown): Date | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== "string") {
    throw new PromoCodeValidationError("expires_at must be a string");
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    throw new PromoCodeValidationError("expires_at is not a valid datetime");
  }
  return d;
}

function parseOptionalInt(raw: unknown, field: string): number | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0) {
    throw new PromoCodeValidationError(`${field} must be a non-negative integer`);
  }
  return raw;
}

export function parsePromoCodeCreateBody(body: unknown): {
  code: string;
  name?: string | null;
  active?: boolean;
  kind: PromoCodeKind;
  percent_off?: number | null;
  amount_off?: number | null;
  max_uses?: number | null;
  expires_at?: Date | null;
  applies_to_product_id?: string | null;
  applies_to_price_id?: string | null;
  metadata?: Prisma.InputJsonValue;
} {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new PromoCodeValidationError("body must be a JSON object");
  }
  const b = body as Record<string, unknown>;

  const code = parseCode(b.code);

  let name: string | null | undefined = undefined;
  if (b.name !== undefined) {
    name = parseOptionalString(b.name);
  }

  const active =
    typeof b.active === "boolean" ? (b.active as boolean) : undefined;

  const kindRaw = b.kind;
  if (kindRaw !== "percent_off" && kindRaw !== "amount_off") {
    throw new PromoCodeValidationError('kind must be "percent_off" or "amount_off"');
  }
  const kind = kindRaw as PromoCodeKind;

  const percent_off = parseOptionalInt(b.percent_off, "percent_off");
  const amount_off = parseOptionalInt(b.amount_off, "amount_off");

  if (kind === "percent_off") {
    if (percent_off === null || percent_off === undefined) {
      throw new PromoCodeValidationError("percent_off is required for percent_off kind");
    }
    if (percent_off < 1 || percent_off > 100) {
      throw new PromoCodeValidationError("percent_off must be 1..100");
    }
  } else {
    if (amount_off === null || amount_off === undefined) {
      throw new PromoCodeValidationError("amount_off is required for amount_off kind");
    }
    if (amount_off < 1) {
      throw new PromoCodeValidationError("amount_off must be >= 1");
    }
  }

  const max_uses = parseOptionalInt(b.max_uses, "max_uses");
  const expires_at = parseOptionalDate(b.expires_at);

  const applies_to_product_id =
    b.applies_to_product_id !== undefined
      ? (parseOptionalString(b.applies_to_product_id) as string | null | undefined)
      : undefined;
  const applies_to_price_id =
    b.applies_to_price_id !== undefined
      ? (parseOptionalString(b.applies_to_price_id) as string | null | undefined)
      : undefined;

  return {
    code,
    name,
    active,
    kind,
    percent_off,
    amount_off,
    max_uses,
    expires_at: expires_at === undefined ? undefined : expires_at,
    applies_to_product_id,
    applies_to_price_id,
  };
}

export async function createPromoCode(
  organizationId: string,
  input: ReturnType<typeof parsePromoCodeCreateBody>,
): Promise<PromoCode> {
  return prisma.promoCode.create({
    data: {
      id: makePrefixedId("promo"),
      organizationId,
      code: input.code,
      name: input.name ?? null,
      active: input.active ?? true,
      kind: input.kind,
      percentOff: input.kind === "percent_off" ? input.percent_off ?? null : null,
      amountOff: input.kind === "amount_off" ? input.amount_off ?? null : null,
      maxUses: input.max_uses ?? null,
      expiresAt: input.expires_at ?? null,
      appliesToProductId: input.applies_to_product_id ?? null,
      appliesToPriceId: input.applies_to_price_id ?? null,
    },
  });
}

export async function listPromoCodes(organizationId: string): Promise<PromoCode[]> {
  return prisma.promoCode.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });
}

export async function revokePromoCode(
  organizationId: string,
  promoCodeId: string,
): Promise<boolean> {
  const existing = await prisma.promoCode.findFirst({
    where: { id: promoCodeId, organizationId },
  });
  if (!existing) return false;
  await prisma.promoCode.update({
    where: { id: promoCodeId },
    data: { active: false },
  });
  return true;
}

