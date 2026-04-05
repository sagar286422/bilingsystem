import { prisma } from "../db/prisma.js";
import * as gatewayCrypto from "../lib/gateway-crypto.js";
import { makePrefixedId } from "../lib/prefixed-id.js";

export class OrganizationBillingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrganizationBillingValidationError";
  }
}

export function parseOrganizationBillingPatch(body: unknown): {
  payment_mode?: "platform" | "byok_razorpay";
  platform_fee_bps?: number;
  razorpay_key_id?: string;
  razorpay_key_secret?: string;
} {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new OrganizationBillingValidationError("body must be a JSON object");
  }
  const b = body as Record<string, unknown>;
  const out: {
    payment_mode?: "platform" | "byok_razorpay";
    platform_fee_bps?: number;
    razorpay_key_id?: string;
    razorpay_key_secret?: string;
  } = {};

  if (b.payment_mode !== undefined) {
    if (b.payment_mode !== "platform" && b.payment_mode !== "byok_razorpay") {
      throw new OrganizationBillingValidationError(
        'payment_mode must be "platform" or "byok_razorpay"',
      );
    }
    out.payment_mode = b.payment_mode;
  }

  if (b.platform_fee_bps !== undefined) {
    if (typeof b.platform_fee_bps !== "number" || !Number.isInteger(b.platform_fee_bps)) {
      throw new OrganizationBillingValidationError(
        "platform_fee_bps must be an integer (basis points, 100 = 1%)",
      );
    }
    if (b.platform_fee_bps < 0 || b.platform_fee_bps > 100_000) {
      throw new OrganizationBillingValidationError(
        "platform_fee_bps must be between 0 and 100000",
      );
    }
    out.platform_fee_bps = b.platform_fee_bps;
  }

  if (b.razorpay_key_id !== undefined) {
    if (typeof b.razorpay_key_id !== "string" || !b.razorpay_key_id.trim()) {
      throw new OrganizationBillingValidationError("razorpay_key_id must be a non-empty string");
    }
    out.razorpay_key_id = b.razorpay_key_id.trim();
  }

  if (b.razorpay_key_secret !== undefined) {
    if (typeof b.razorpay_key_secret !== "string" || !b.razorpay_key_secret.trim()) {
      throw new OrganizationBillingValidationError(
        "razorpay_key_secret must be a non-empty string when provided",
      );
    }
    out.razorpay_key_secret = b.razorpay_key_secret.trim();
  }

  return out;
}

export async function patchOrganizationBilling(
  organizationId: string,
  patch: ReturnType<typeof parseOrganizationBillingPatch>,
) {
  let secretEnc: string | undefined;
  if (patch.razorpay_key_secret !== undefined) {
    secretEnc = gatewayCrypto.encryptGatewaySecret(patch.razorpay_key_secret);
  }

  await prisma.$transaction(async (tx) => {
    const data: {
      paymentMode?: string;
      platformFeeBps?: number;
    } = {};
    if (patch.payment_mode !== undefined) data.paymentMode = patch.payment_mode;
    if (patch.platform_fee_bps !== undefined)
      data.platformFeeBps = patch.platform_fee_bps;
    if (patch.razorpay_key_id !== undefined && secretEnc !== undefined) {
      data.paymentMode = "byok_razorpay";
    }

    if (Object.keys(data).length > 0) {
      await tx.organization.update({
        where: { id: organizationId },
        data,
      });
    }

    if (patch.razorpay_key_id !== undefined && secretEnc !== undefined) {
      await tx.organizationRazorpayCredential.upsert({
        where: { organizationId },
        create: {
          id: makePrefixedId("rzc"),
          organizationId,
          keyId: patch.razorpay_key_id,
          secretEnc,
        },
        update: {
          keyId: patch.razorpay_key_id,
          secretEnc,
        },
      });
    } else if (patch.payment_mode === "platform") {
      await tx.organizationRazorpayCredential.deleteMany({
        where: { organizationId },
      });
    }
  });

  return prisma.organization.findUnique({
    where: { id: organizationId },
    include: { razorpayCredential: { select: { id: true, keyId: true } } },
  });
}
