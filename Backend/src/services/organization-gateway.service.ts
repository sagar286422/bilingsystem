import { prisma } from "../db/prisma.js";
import * as gatewayCrypto from "../lib/gateway-crypto.js";

export type RazorpayCredentials = { keyId: string; keySecret: string };

/**
 * Reads platform Razorpay credentials from env. Supports common naming variants.
 * Values are trimmed (fix accidental spaces from `KEY = value` in .env).
 *
 * Key ID: PLATFORM_RAZORPAY_KEY_ID, RAZORPAY_API_KEY, RAZORPAY_KEY_ID
 * Secret: PLATFORM_RAZORPAY_KEY_SECRET, RAZORPAY_API_SECRET, RAZORPAY_KEY_SECRET
 */
export function getPlatformRazorpayFromEnv(): RazorpayCredentials | null {
  const keyId = firstNonEmpty([
    process.env.PLATFORM_RAZORPAY_KEY_ID,
    process.env.RAZORPAY_API_KEY,
    process.env.RAZORPAY_KEY_ID,
    envLoose("RAZORPAY_API_KEY"),
    envLoose("PLATFORM_RAZORPAY_KEY_ID"),
  ]);
  const keySecret = firstNonEmpty([
    process.env.PLATFORM_RAZORPAY_KEY_SECRET,
    process.env.RAZORPAY_API_SECRET,
    process.env.RAZORPAY_KEY_SECRET,
    envLoose("RAZORPAY_API_SECRET"),
    envLoose("PLATFORM_RAZORPAY_KEY_SECRET"),
  ]);
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

function firstNonEmpty(values: (string | undefined)[]): string {
  for (const v of values) {
    if (typeof v !== "string") continue;
    const t = v.trim();
    if (t) return t;
  }
  return "";
}

/** Handles `.env` typos like `RAZORPAY_API_KEY =x` (space in key name after dotenv parse). */
function envLoose(canonicalKey: string): string {
  const direct = process.env[canonicalKey];
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const compact = canonicalKey.replace(/\s+/g, "");
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v !== "string" || !v.trim()) continue;
    if (k.replace(/\s+/g, "") === compact) return v.trim();
  }
  return "";
}

export type ResolveCredsResult =
  | RazorpayCredentials
  | { error: "BYOK_NOT_CONFIGURED" }
  | { error: "PLATFORM_RAZORPAY_NOT_CONFIGURED" };

export async function resolveRazorpayCredentialsForOrg(
  organizationId: string,
): Promise<ResolveCredsResult> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  });
  if (!org) return { error: "PLATFORM_RAZORPAY_NOT_CONFIGURED" };

  if (org.paymentMode === "byok_razorpay") {
    const row = await prisma.organizationRazorpayCredential.findUnique({
      where: { organizationId },
    });
    if (!row) return { error: "BYOK_NOT_CONFIGURED" };
    try {
      const keySecret = gatewayCrypto.decryptGatewaySecret(row.secretEnc);
      return { keyId: row.keyId, keySecret };
    } catch {
      return { error: "BYOK_NOT_CONFIGURED" };
    }
  }

  const platform = getPlatformRazorpayFromEnv();
  if (!platform) return { error: "PLATFORM_RAZORPAY_NOT_CONFIGURED" };
  return platform;
}

/** Exposes only Key ID for Razorpay Checkout (safe for browser). */
export async function razorpayKeyIdForCheckout(organizationId: string): Promise<
  string | null
> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  });
  if (!org) return null;
  if (org.paymentMode === "byok_razorpay") {
    const row = await prisma.organizationRazorpayCredential.findUnique({
      where: { organizationId },
      select: { keyId: true },
    });
    return row?.keyId ?? null;
  }
  return getPlatformRazorpayFromEnv()?.keyId ?? null;
}
